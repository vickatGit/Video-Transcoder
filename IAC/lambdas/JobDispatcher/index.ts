import { config } from "dotenv";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || "ap-south-1",
});

config();

export const handler = async (event: any) => {
  const queueUrl = process.env.SQS_QUEUE_URL;

  if (!queueUrl) {
    throw new Error("SQS_QUEUE_URL environment variable is not set");
  }

  // Message to send to the SQS queue
  const params = {
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify({
      fileKey: event.Records[0].s3.object.key, // Assuming the Lambda is triggered by an S3 event
      bucketName: event.Records[0].s3.bucket.name,
      timestamp: new Date().toISOString(),
    }),
  };

  try {
    const command = new SendMessageCommand(params);
    const result = await sqsClient.send(command);
    console.log("Message sent successfully:", result.MessageId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Message sent successfully",
        messageId: result.MessageId,
      }),
    };
  } catch (error) {
    console.error("Error sending message to SQS:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to send message", error }),
    };
  }
};
