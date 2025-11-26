import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "StudentGrades";

export const handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));
    
    try {
        const httpMethod = event.httpMethod;
        
        // Handle OPTIONS 
        if (httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
                },
                body: JSON.stringify({ message: "CORS OK" })
            };
        }
        
        // Handle GET request will return all grades and average
        if (httpMethod === 'GET') {
            console.log("Processing GET request");
            
            const scanResult = await dynamo.send(
                new ScanCommand({ TableName: TABLE_NAME })
            );
            
            console.log("Scan result:", JSON.stringify(scanResult, null, 2));
            
            const grades = (scanResult.Items || []).map(i => ({
                student_id: i.student_id,
                grade: Number(i.grade)
            })).filter(g => !isNaN(g.grade));
            
            const gradeValues = grades.map(g => g.grade);
            const avg = gradeValues.length > 0
                ? gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length
                : 0;
            
            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                body: JSON.stringify({ grades, average: avg })
            };
        }

        // Handle POST request will add a new grade
        if (httpMethod === 'POST') {
            console.log("Processing POST request");
            console.log("Event body:", event.body);
            
            const body = JSON.parse(event.body);
            const student_id = body.student_id;
            const grade = Number(body.grade);

            console.log("Parsed data - student_id:", student_id, "grade:", grade);

            if (!student_id || isNaN(grade)) {
                return {
                    statusCode: 400,
                    headers: { 
                        "Access-Control-Allow-Origin": "*",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ error: "Invalid student_id or grade" })
                };
            }

            // Put item in DynamoDB
            const putParams = {
                TableName: TABLE_NAME,
                Item: {
                    student_id: student_id,
                    timestamp: Date.now(),
                    grade: grade
                }
            };
            
            console.log("Putting item:", JSON.stringify(putParams, null, 2));
            
            await dynamo.send(new PutCommand(putParams));
            
            console.log("Item saved successfully");

            // Get updated average
            const scanResult = await dynamo.send(
                new ScanCommand({ TableName: TABLE_NAME })
            );
            
            const grades = (scanResult.Items || [])
                .map(i => Number(i.grade))
                .filter(g => !isNaN(g));
            
            const avg = grades.length > 0 
                ? grades.reduce((a, b) => a + b, 0) / grades.length 
                : 0;

            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                body: JSON.stringify({ 
                    average: avg,
                    itemsSaved: grades.length 
                })
            };
        }
        
        // Method not allowed
        return {
            statusCode: 405,
            headers: { 
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ error: "Method not allowed" })
        };

    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            headers: { 
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                error: error.message,
                errorType: error.name
            })
        };
    }
};
