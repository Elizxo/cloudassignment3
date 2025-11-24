import AWS from "aws-sdk";

const dynamo = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = "StudentGrades";

export const handler = async (event) => {
    try {
        const body = JSON.parse(event.body);

        const student_id = body.student_id;
        const grade = parseFloat(body.grade);

        // Save grade
        await dynamo.put({
            TableName: TABLE_NAME,
            Item: {
                student_id: student_id,
                timestamp: Date.now(),
                grade: grade
            }
        }).promise();

        // Scan for average
        const scanResult = await dynamo.scan({
            TableName: TABLE_NAME
        }).promise();

        const grades = scanResult.Items.map(i => i.grade);
        const avg = grades.reduce((a, b) => a + b, 0) / grades.length;

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                message: "Grade saved!",
                average: avg
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
