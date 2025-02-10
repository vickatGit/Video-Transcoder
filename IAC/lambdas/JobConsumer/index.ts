import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { createClient } from "redis";
import { SQSClient, ChangeMessageVisibilityCommand } from "@aws-sdk/client-sqs";
import { SQSEvent } from "aws-lambda";
import { config } from "dotenv";

config();

export const handler = async (event: SQSEvent) => {
  const ecsClient = new ECSClient({ region: process.env.AWS_REGION });
  const redisClient = createClient({
    password: process.env.REDIS_CLOUD_PASSWORD!,
    socket: {
      host: process.env.REDIS_CLOUD_HOST!,
      port: parseInt(process.env.REDIS_CLOUD_PORT!),
    },
  });

  const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
  console.log("aws region : ", process.env.AWS_REGION);
  console.log("redis port : ", event.Records[0].body);
  const data = JSON.parse(event.Records[0].body);
  try {
    await redisClient.connect();
    const serverCount = parseInt(
      (await redisClient.get("server_count")) || "0"
    );
    if (serverCount >= 5) {
      await sqsClient.send(
        new ChangeMessageVisibilityCommand({
          QueueUrl: process.env.QUEUE_URL,
          ReceiptHandle: event.Records[0].receiptHandle,
          VisibilityTimeout: 600,
        })
      );
      console.log("Server is busy. Changed SQS message visibility.");
      return;
    }
  } catch (error) {
    console.error("Redis or SQS Error:", error);
    return;
  } finally {
    await redisClient.quit();
  }

  try {
    const runTaskCommand = new RunTaskCommand({
      cluster: process.env.ECS_CLUSTER_NAME!,
      taskDefinition: process.env.TASK_DEF_NAME!,
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: process.env.SUBNET_IDS!.split(","),
          securityGroups: process.env.SECURITY_GROUP!.split(","),
          assignPublicIp: "ENABLED",
        },
      },
      overrides: {
        containerOverrides: [
          {
            name: process.env.CONTAINER_NAME!,
            environment: [
              { name: "S3_FILE_KEY", value: data.fileKey },
              { name: "RECEIPT_HANDLE", value: event.Records[0].receiptHandle },
            ],
          },
        ],
      },
      launchType: "FARGATE",
    });

    const response = await ecsClient.send(runTaskCommand);
    console.log("Task started successfully:", response);
  } catch (error) {
    console.error("Failed to start ECS task:", error);
  }
};
