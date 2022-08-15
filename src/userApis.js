const db = require("./dynamodb")
const sls = require('serverless-http');
const express = require('express')
const cors = require('cors');
const app = express()
app.use(cors());
const {
    GetItemCommand,
    PutItemCommand,
    UpdateItemCommand
} = require("@aws-sdk/client-dynamodb")
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");



// register user
app.post('/user/registration', async (req, res) => {
    try {
        const obj = JSON.parse(req.body)
        const isUserExsist = {
            TableName: process.env.USER_TABLE_NAME,
            Key: marshall({ email: obj.email }),
        };
        const { Item } = await db.send(new GetItemCommand(isUserExsist));
        if (Item && Item.email) {
            res.status(302).json({
                message: 'User already exists.',
                success: false
            });
        } else {
            const newObj = {
                name: obj.name,
                email: obj.email,
                password: obj.password,
                token: 'd41d8cd98f00b204e9800998ecf8427e32f11ddf1556sdfs8xddd',
                uuid: obj.uuid,
                billingDetails: {
                    card_number: "",
                    cvc: "",
                    address: "",
                    phone: ""
                }
            }
            const params = {
                TableName: process.env.USER_TABLE_NAME, // table name from the serverless file
                Item: marshall(newObj || {}) // conver it in dynamo formate
            }
            await db.send(new PutItemCommand(params))
            res.status(201).json({
                message: 'Successfully created account.',
                success: true,
                data: {
                    user_agent: {
                        name: obj.name,
                        email: obj.email,
                        uuid: obj.uuid,
                        auth: true,
                        token: 'd41d8cd98f00b204e9800998ecf8427e32f11ddf1556sdfs8xddd'
                    }
                }
            });
        }
    } catch (e) {
        res.status(500).json({
            message: `Server error 500`,
            success: false,
            error: e.message,
            stack: e.stack
        });
    }
})



// login user
app.post('/user/login', async (req, res) => {
    try {
        const obj = JSON.parse(req.body)
        const isUserExsist = {
            TableName: process.env.USER_TABLE_NAME,
            Key: marshall({ email: obj.email }),
        };
        const { Item } = await db.send(new GetItemCommand(isUserExsist));

        if (Item === undefined) {
            res.status(404).json({
                message: 'Invalid credentials.',
                success: false
            });
        }
        else if (Item.email.S !== obj.email || Item.password.S !== obj.password || Item.email.S !== obj.email && Item.password.S !== obj.password) {
            res.status(404).json({
                message: 'Invalid credentials.',
                success: false
            });
        }
        else {
            // const params = {
            //     TableName: process.env.USER_TABLE_NAME, // table name from the serverless file
            //     Item: marshall(obj || {}) // conver it in dynamo formate
            // }
            // await db.send(new PutItemCommand(params))
            const userData = unmarshall(Item)
            delete userData['password']
            res.status(200).json({
                message: 'Successfully logged in.',
                success: true,
                data: {
                    user_agent: {
                        ...userData,
                        auth: true
                    },
                }
            });
        }
    } catch (e) {
        res.status(500).json({
            message: `Server error 500`,
            success: false,
            error: e.message,
            stack: e.stack
        });
    }
})



// add user billing address
app.put('/user/billing/details/:email', async (req, res) => {
    try {
        const isUserExsist = {
            TableName: process.env.USER_TABLE_NAME,
            Key: marshall({ email: req.params.email }),
        };
        const { Item } = await db.send(new GetItemCommand(isUserExsist));
        if (Item === undefined) {
            res.status(404).json({
                message: 'Invalid credentials.',
                success: false
            });
        } else if (Item && Item.email.S) {
            const body = JSON.parse(req.body);
            const objKeys = Object.keys(body);
            const params = {
                TableName: process.env.USER_TABLE_NAME,
                Key: marshall({ email: req.params.email }),
                UpdateExpression: `SET ${objKeys.map((_, index) => `#key${index} = :value${index}`).join(", ")}`,
                ExpressionAttributeNames: objKeys.reduce((acc, key, index) => ({
                    ...acc,
                    [`#key${index}`]: key,
                }), {}),
                ExpressionAttributeValues: marshall(objKeys.reduce((acc, key, index) => ({
                    ...acc,
                    [`:value${index}`]: body[key],
                }), {})),
            };
            await db.send(new UpdateItemCommand(params));
            res.status(202).json({
                message: 'Successfully added billing details.',
                success: true,
                data: {
                    ...unmarshall(Item),
                    ...body
                }
            });
        }
    } catch (e) {
        res.status(500).json({
            message: `Server error 500`,
            success: false,
            error: e.message,
            stack: e.stack
        });
    }
})

module.exports.handler = sls(app);