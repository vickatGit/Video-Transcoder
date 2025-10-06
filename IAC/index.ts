import * as archiver from "archiver";
import * as esbuild from "esbuild";
import * as fs from "fs";

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { execSync } from "child_process";

import { config } from "dotenv";
config();

import "./VideoEncodingService";

const vpc = new aws.ec2.Vpc("my-vpc", {
  cidrBlock: "10.0.0.0/16",
  enableDnsSupport: true,
  enableDnsHostnames: true,
});

// Create a public subnet
const publicSubnet = new aws.ec2.Subnet("public-subnet", {
  vpcId: vpc.id,
  cidrBlock: "10.0.1.0/24",
  availabilityZone: "ap-south-1a", // Use your desired AZ
  mapPublicIpOnLaunch: true, // Ensure public IP assignment
});

// Create an Internet Gateway
const internetGateway = new aws.ec2.InternetGateway("my-internet-gateway", {
  vpcId: vpc.id,
});

// Create a route table for public subnet with a route to the internet
const publicRouteTable = new aws.ec2.RouteTable("public-route-table", {
  vpcId: vpc.id,
  routes: [
    {
      cidrBlock: "0.0.0.0/0", // All internet-bound traffic
      gatewayId: internetGateway.id,
    },
  ],
});

// Associate the route table with the public subnet
const routeTableAssociation = new aws.ec2.RouteTableAssociation(
  "public-route-table-association",
  {
    subnetId: publicSubnet.id,
    routeTableId: publicRouteTable.id,
  }
);

// Create a security group for ECS tasks
const securityGroup = new aws.ec2.SecurityGroup("ecs-security-group", {
  vpcId: vpc.id,
  egress: [
    {
      fromPort: 0, // Must be 0 for "ALL" protocols
      toPort: 0, // Must be 0 for "ALL" protocols
      protocol: "-1", // Allow all protocols
      cidrBlocks: ["0.0.0.0/0"], // Allow traffic to anywhere
    },
  ],
  ingress: [
    {
      fromPort: 80, // Example for HTTP
      toPort: 80, // Example for HTTP
      protocol: "tcp", // Allow TCP traffic
      cidrBlocks: ["0.0.0.0/0"], // Allow inbound traffic from anywhere
    },
  ],
});

// ----------------- S3 Bucket -----------------

const transS3Bucket = new aws.s3.Bucket("trans-bucket", {
  acl: "private",
  forceDestroy: true,
});

// ------------- SQS Queeue -------------
const transQueue = new aws.sqs.Queue("transQueue", {
  visibilityTimeoutSeconds: 900, // Time a message is invisible after being received
  messageRetentionSeconds: 1209600, // Maximum retention period (14 days)
  receiveWaitTimeSeconds: 0, // Long polling disabled
});

// ----------------- Lambda Zipper -----------------
const zipLambdaCode = (outputPath: string, inputDir: string) => {
  return new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Compression level
    });

    output.on("close", () => resolve());
    archive.on("error", (err: any) => reject(err));

    archive.pipe(output);
    archive.directory(inputDir, false); // Zip all files inside the directory (false = no directory structure in zip)
    archive.finalize();
  });
};

const deployJobDispatcherLambda = async () => {
  const lambdaExecutionRole = new aws.iam.Role(
    "JobDispatcherLambdaExecutionRole",
    {
      assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: "lambda.amazonaws.com",
      }),
    }
  );

  // Attach a policy to allow full access to S3 (adjust permissions as needed)
  new aws.iam.RolePolicyAttachment("JobDispatcherLambdaS3Policy", {
    role: lambdaExecutionRole.name,
    policyArn: aws.iam.ManagedPolicies.AmazonS3FullAccess,
  });

  new aws.iam.RolePolicyAttachment("JobDispatcherLambdaCloudWatchPolicy", {
    role: lambdaExecutionRole.name,
    policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
  });
  new aws.iam.RolePolicyAttachment("JobDispatcherLambdaSQSPolicy", {
    role: lambdaExecutionRole.name,
    policyArn: aws.iam.ManagedPolicies.AmazonSQSFullAccess,
  });
  // ----------------- Job Dispatcher Lambda -----------------

  const jobDispatcherLambdaBundlePath = "./dist/JobDispatcher/index.js";
  esbuild.buildSync({
    entryPoints: ["./lambdas/JobDispatcher/index.ts"], // Your Lambda entry file
    bundle: true,
    platform: "node",
    target: "node18", // Match Lambda runtime version
    outfile: jobDispatcherLambdaBundlePath,
    external: ["aws-sdk"], // AWS SDK is pre-installed in the Lambda runtime
  });

  await zipLambdaCode("./dist/JobDispatcher.zip", "./dist/JobDispatcher");
  const jobDispatcherLambda = new aws.lambda.Function("Job-Dispatcher-Lambda", {
    runtime: aws.lambda.Runtime.NodeJS18dX,
    code: new pulumi.asset.FileArchive("./dist/JobDispatcher.zip"), // Use the bundled file
    handler: "index.handler", // Match the bundled file's export
    role: lambdaExecutionRole.arn,
    environment: transQueue.url?.apply((url) => {
      return {
        variables: {
          SQS_QUEUE_URL: url,
        },
      };
    }),
  });

  const jobDispatcherLambdaPermission = new aws.lambda.Permission(
    "Allow-JobDispatcher-Execution-Role-To-Invoke-Lambda",
    {
      action: "lambda:InvokeFunction",
      function: jobDispatcherLambda.name,
      principal: "s3.amazonaws.com",
      sourceArn: transS3Bucket.arn,
    }
  );

  const bucketNotification = new aws.s3.BucketNotification(
    "bucketNotification",
    {
      bucket: transS3Bucket.id,
      lambdaFunctions: [
        {
          lambdaFunctionArn: jobDispatcherLambda.arn,
          events: ["s3:ObjectCreated:*"],
          filterPrefix: "temp/",
        },
      ],
    },
    { dependsOn: [jobDispatcherLambdaPermission] }
  );
  buildTranscoderService();
};

deployJobDispatcherLambda();

const deployJobConsumerLambda = async (ecsConfig: {
  ecs_cluster_name: string;
  region: string;
  task_def_name: string;
  subnet_ids: string[];
  security_group: string[];
  container_name: string;
}) => {
  const lambdaExecutionRole = new aws.iam.Role(
    "JobConsumerLambdaExecutionRole",
    {
      assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: "lambda.amazonaws.com",
      }),
    }
  );

  new aws.iam.RolePolicyAttachment("JobConsumerLambdaCloudWatchPolicy", {
    role: lambdaExecutionRole.name,
    policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
  });

  new aws.iam.RolePolicyAttachment("JobConsumerLambdaSQSPolicy", {
    role: lambdaExecutionRole.name,
    policyArn: aws.iam.ManagedPolicies.AmazonSQSFullAccess,
  });

  new aws.iam.RolePolicyAttachment("JobConsumerLambdaECSFullAccess", {
    role: lambdaExecutionRole.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonECS_FullAccess", // Full ARN for the AmazonECS_FullAccess policy
  });

  const jobConsumerLambdaBundlePath = "./dist/JobConsumer/index.js";
  esbuild.buildSync({
    entryPoints: ["./lambdas/JobConsumer/index.ts"], // Your Lambda entry file
    bundle: true,
    platform: "node",
    target: "node18", // Match Lambda runtime version
    outfile: jobConsumerLambdaBundlePath,
    external: ["aws-sdk"], // AWS SDK is pre-installed in the Lambda runtime
  });

  await zipLambdaCode("./dist/JobConsumer.zip", "./dist/JobConsumer");
  console.log("cloud host : ", process.env.REDIS_CLOUD_HOST);
  const jobConsumerLambda = new aws.lambda.Function("Job-Consumer-Lambda", {
    runtime: aws.lambda.Runtime.NodeJS18dX,
    code: new pulumi.asset.FileArchive("./dist/JobConsumer.zip"), // Use the bundled file
    handler: "index.handler", // Match the bundled file's export
    role: lambdaExecutionRole.arn,
    environment: {
      variables: {
        QUEUE_URL: transQueue.id,
        ECS_CLUSTER_NAME: ecsConfig.ecs_cluster_name,
        REGION: ecsConfig.region,
        TASK_DEF_NAME: ecsConfig.task_def_name,
        SUBNET_IDS: ecsConfig.subnet_ids.join(","), // Convert array to comma-separated string
        SECURITY_GROUP: ecsConfig.security_group.join(","), // Convert array to comma-separated string
        CONTAINER_NAME: ecsConfig.container_name,
        REDIS_CLOUD_HOST: process.env.REDIS_CLOUD_HOST || "",
        REDIS_CLOUD_PORT: process.env.REDIS_CLOUD_PORT || "",
        REDIS_CLOUD_PASSWORD: process.env.REDIS_CLOUD_PASSWORD || "",
      },
    },
  });

  const sqsEventSourceMapping = new aws.lambda.EventSourceMapping(
    "job-dispatcher-sqs-event",
    {
      batchSize: 1, // Number of messages to process in one batch
      eventSourceArn: transQueue.arn.apply((arn) => arn),
      functionName: jobConsumerLambda.arn.apply((arn) => arn),
      enabled: true, // Ensure the event source is enabled
    }
  );
};

interface DeployCronConfig {
  s3BucketName: string;
  region: string;
  redisHost?: string;
  redisPort?: string;
  redisPassword?: string;
}

export const deployCron = async (config: DeployCronConfig) => {
  // IAM Role for Lambda Execution
  const lambdaExecutionRole = new aws.iam.Role("S3CleanupLambdaExecutionRole", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: "lambda.amazonaws.com",
    }),
  });

  // Attach necessary policies
  new aws.iam.RolePolicyAttachment("LambdaCloudWatchPolicy", {
    role: lambdaExecutionRole.name,
    policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
  });

  new aws.iam.RolePolicyAttachment("LambdaS3FullAccess", {
    role: lambdaExecutionRole.name,
    policyArn: aws.iam.ManagedPolicies.AmazonS3FullAccess,
  });

  // Bundle Lambda Code
  const lambdaBundlePath = "./dist/S3Cleanup/index.js";
  esbuild.buildSync({
    entryPoints: ["./lambdas/S3Cleanup/index.ts"], // Your Lambda entry file
    bundle: true,
    platform: "node",
    target: "node18", // Match Lambda runtime version
    outfile: lambdaBundlePath,
    external: ["aws-sdk"], // AWS SDK is pre-installed in Lambda
  });

  // Zip the bundled file
  await zipLambdaCode("./dist/S3Cleanup.zip", "./dist/S3Cleanup");

  // Deploy Lambda Function
  const s3CleanupLambda = new aws.lambda.Function("S3-Cleanup-Lambda", {
    runtime: aws.lambda.Runtime.NodeJS18dX,
    code: new pulumi.asset.FileArchive("./dist/S3Cleanup.zip"),
    handler: "index.handler",
    role: lambdaExecutionRole.arn,
    timeout: 60, // 1 min timeout
    memorySize: 512, // 512 MB RAM
    environment: {
      variables: {
        S3_BUCKET_NAME: config.s3BucketName,
        REDIS_CLOUD_HOST: config.redisHost || "",
        REDIS_CLOUD_PORT: config.redisPort || "",
        REDIS_CLOUD_PASSWORD: config.redisPassword || "",
      },
    },
  });

  // Create CloudWatch Event Rule to trigger Lambda every hour
  const cloudWatchRule = new aws.cloudwatch.EventRule("S3CleanupSchedule", {
    scheduleExpression: "cron(1 * * * ? *)", // Runs every hour 1:01, 2:01, 3:01
  });

  // Add Lambda as target for CloudWatch Event
  new aws.cloudwatch.EventTarget("S3CleanupLambdaTarget", {
    rule: cloudWatchRule.name,
    arn: s3CleanupLambda.arn,
  });

  // Grant CloudWatch permission to invoke Lambda
  new aws.lambda.Permission("AllowCloudWatchToInvokeLambda", {
    action: "lambda:InvokeFunction",
    function: s3CleanupLambda.name,
    principal: "events.amazonaws.com",
    sourceArn: cloudWatchRule.arn,
  });

  return {
    lambdaArn: s3CleanupLambda.arn,
    cloudWatchRuleArn: cloudWatchRule.arn,
  };
};

transS3Bucket.id.apply((S3_BUCKET) => {
  deployCron({
    s3BucketName: S3_BUCKET,
    region: "ap-south-1",
    redisHost: process.env.REDIS_CLOUD_HOST,
    redisPort: process.env.REDIS_CLOUD_PORT,
    redisPassword: process.env.REDIS_CLOUD_PASSWORD,
  }).then((output) => {
    console.log("Lambda ARN:", output.lambdaArn);
    console.log("CloudWatch Rule ARN:", output.cloudWatchRuleArn);
  });
});

async function buildTranscoderService() {
  const videoTranscoderRepo = new aws.ecr.Repository("video-transcoder-repo", {
    name: "video-transcoder-service-repo",
    forceDelete: true,
  });

  const authToken = aws.ecr.getAuthorizationTokenOutput({
    registryId: videoTranscoderRepo.registryId,
  });

  const repoUrl = videoTranscoderRepo.repositoryUrl;

  repoUrl.apply((url) => {
    authToken.apply((token) => {
      transQueue.url.apply((SQS_QUEUE_URL) => {
        transS3Bucket.id.apply((S3_BUCKET) => {
          const dockerLoginCommand = `docker login --username AWS --password ${token.password} ${url}`;
          console.log("Authenticating Docker with ECR...");
          execSync(dockerLoginCommand, { stdio: "inherit" });

          const imageName = `${url}:latest`;
          console.log("Building Docker image locally...");
          execSync(`docker build -t ${imageName} .`, { stdio: "inherit" });
          console.log("Pushing Docker image to ECR...");
          execSync(`docker push ${imageName}`, { stdio: "inherit" });

          const cluster = new aws.ecs.Cluster("trans-cluster", {
            name: "transcoder-cluster",
          });

          // Create Log Group
          const logGroup = new aws.cloudwatch.LogGroup(
            "ecs-transcoder-log-group",
            {
              name: "/ecs/transcoder",
              retentionInDays: 7, // Retain logs for 7 days
            }
          );

          const taskRole = new aws.iam.Role("transcoder-task-role", {
            assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
              Service: "ecs-tasks.amazonaws.com",
            }),
          });

          const executionRole = new aws.iam.Role("transcoder-execution-role", {
            assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
              Service: "ecs-tasks.amazonaws.com",
            }),
          });

          new aws.iam.RolePolicyAttachment("task-role-s3-full-access", {
            role: taskRole.name,
            policyArn: aws.iam.ManagedPolicy.AmazonS3FullAccess,
          });

          new aws.iam.RolePolicyAttachment("task-role-sqs-full-access", {
            role: taskRole.name,
            policyArn: aws.iam.ManagedPolicy.AmazonSQSFullAccess,
          });

          new aws.iam.RolePolicyAttachment("task-role-policy", {
            role: taskRole.name,
            policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
          });

          new aws.iam.RolePolicyAttachment("execution-role-policy", {
            role: executionRole.name,
            policyArn: aws.iam.ManagedPolicy.AmazonECSTaskExecutionRolePolicy,
          });

          const taskDefinition = new aws.ecs.TaskDefinition(
            "transcoder-task-def",
            {
              family: "transcoder-task",
              cpu: "2048", // 2 vCPUs
              memory: "4096", // 4 GB (minimum for 2 vCPUs on Fargate)
              networkMode: "awsvpc",
              requiresCompatibilities: ["FARGATE"],
              executionRoleArn: executionRole.arn,
              taskRoleArn: taskRole.arn,
              containerDefinitions: JSON.stringify([
                {
                  name: "transcoder-container",
                  image: imageName, // Use the pushed image
                  essential: true,
                  portMappings: [
                    {
                      containerPort: 8000,
                      protocol: "tcp",
                    },
                  ],
                  environment: [
                    {
                      name: "SQS_QUEUE_URL",
                      value: SQS_QUEUE_URL,
                    },
                    {
                      name: "S3_BUCKET",
                      value: S3_BUCKET,
                    },
                    {
                      name: "REDIS_CLOUD_HOST",
                      value: process.env.REDIS_CLOUD_HOST || "",
                    },
                    {
                      name: "REDIS_CLOUD_PORT",
                      value: process.env.REDIS_CLOUD_PORT || "",
                    },
                    {
                      name: "REDIS_CLOUD_PASSWORD",
                      value: process.env.REDIS_CLOUD_PASSWORD || "",
                    },
                    {
                      name: "MONGOOSE_DB_URL",
                      value: process.env.MONGOOSE_DB_URL,
                    },
                  ],
                  logConfiguration: {
                    logDriver: "awslogs",
                    options: {
                      "awslogs-group": "/ecs/transcoder",
                      "awslogs-region": "ap-south-1", // Replace with your region
                      "awslogs-stream-prefix": "transcoder-container",
                    },
                  },
                },
              ]),
              tags: {},
            }
          );

          const service = new aws.ecs.Service("transcoder-service", {
            name: "trans-service",
            cluster: cluster.arn,
            desiredCount: 0,
            launchType: "FARGATE",
            taskDefinition: taskDefinition.arn,
            networkConfiguration: {
              assignPublicIp: true,
              subnets: [publicSubnet.id],
              // securityGroups: [securityGroup.id, taskEniSecurityGroup?.id],
              // securityGroups: [ecsSecurityGroup.id],
            },
            tags: {},
          });

          pulumi
            .all([
              cluster.name,
              publicSubnet?.id,
              securityGroup?.id,
              taskDefinition?.arn,
            ])
            .apply(([clusterName, subnetId, securityGroupId, taskDefArn]) => {
              if (clusterName && subnetId && securityGroupId && taskDefArn) {
                const taskName = taskDefArn.split("/")[1]; // Extract task name from ARN
                console.log("Resolved Task Definition Name:", taskName);

                deployJobConsumerLambda({
                  ecs_cluster_name: clusterName,
                  region: "ap-south-1",
                  task_def_name: taskName,
                  subnet_ids: [subnetId],
                  security_group: [securityGroupId],
                  container_name: "transcoder-container",
                });
              } else {
                console.error("One or more required values are missing:", {
                  clusterName,
                  subnetId,
                  securityGroupId,
                  taskDefArn,
                });
              }
            });
        });
      });
    });
  });
}
