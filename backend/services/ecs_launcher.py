import boto3
import os
from dotenv import load_dotenv
load_dotenv()

ECS_CLUSTER = os.getenv("ECS_CLUSTER", "clipfusion-cluster1")
TASK_DEFINITION = os.getenv("ECS_TASK_DEFINITION", "clipfusion-processor-task")
CONTAINER_NAME = os.getenv("ECS_CONTAINER_NAME", "clipfusion-worker")
REGION = os.getenv("AWS_REGION", "us-east-2")


# Confirm the values
# print("Subnet ID:", os.getenv("AWS_SUBNET_ID"))
# print("Security Group ID:", os.getenv("AWS_SECURITY_GROUP_ID"))

SUBNET_ID = os.getenv("AWS_SUBNET_ID")
SECURITY_GROUP_ID = os.getenv("AWS_SECURITY_GROUP_ID")

ecs_client = boto3.client("ecs", region_name=REGION)

def launch_ecs_task(mode, bucket, input_key, output_key, start=None, end=None):
    env_vars = [
        {"name": "MODE", "value": mode},
        {"name": "BUCKET", "value": bucket},
        {"name": "INPUT_KEY", "value": input_key},
        {"name": "OUTPUT_KEY", "value": output_key},
    ]

    if mode == "generate_clip":
        env_vars += [
            {"name": "START", "value": str(start)},
            {"name": "END", "value": str(end)},
        ]

    response = ecs_client.run_task(
        cluster=ECS_CLUSTER,
        launchType="FARGATE",
        taskDefinition=TASK_DEFINITION,
        networkConfiguration={
            "awsvpcConfiguration": {
                "subnets": [SUBNET_ID],
                "securityGroups": [SECURITY_GROUP_ID],
                "assignPublicIp": "ENABLED"
            }
        },
        overrides={
            "containerOverrides": [
                {
                    "name": CONTAINER_NAME,
                    "environment": env_vars
                }
            ]
        }
    )

    return response
