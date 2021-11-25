//Gets all key and webhook info from the .env file
require('dotenv').config();

//imports all packages needed
const { WebhookClient, MessageEmbed } = require('discord.js');
const bodyParser = require('body-parser')
const app = require('express')()

//extracts discord webhook id and secret key
const [hookID, hookSecret] = process.env.DISCORD_HOOK.split('/').splice(5)
let hook = new WebhookClient(hookID, hookSecret);

//extracts stripe api key and endpoint
const stripe = require('stripe')(process.env.STRIPE_API_KEY)
const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;


app.get('/', (request, response) => {
    response.status.json({
        response: true,
        description: "Discord webhook",
    });
});

app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (request, response) => {
    let event;

    const sig = request.headers['stripe-signature'];

    //tries to create an event from the data received
    try {
        event = stripe.webhooks.constructEvent(
            request.body,
            sig,
            endpointSecret,
        );
    } catch (err) {
        response.status(400).send(`Webhook Error: ${err.message} `);
    }

    let embed = new MessageEmbed();

    //checks to see what kind of event was received
    switch (event.type) {
        case 'charge.succeeded':
            //if the charge succeeded, create an embed with the description of the charge and the amount
            let objectData = event.data.object
            embed.setColor('#6772e5')
            embed.setTitle("Successful charge")
            embed.addFields(
                {
                    name: "Description",
                    value: objectData.description
                },
                {
                    name: "Amount",
                    value: new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: objectData.currency,
                    }).format(objectData.amount / 100)
                }
            )
            //send embed to webhook
            hook.send({embeds: embed});
            return response.status(200).send(objectData);
        case 'charge.failed':
            //if the charge failed, create an embed with the email from the receipt and the amount
            let objectData = event.data.object

            embed.setColor('#6772e5')
            embed.setTitle("Charge Failed")
            embed.addFields(
                {
                    name: "Email",
                    value: objectData.receipt_email
                },
                {
                    name: "Amount",
                    value: new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: objectData.currency,
                    }).format(objectData.amount / 100)
                }
            )
            hook.send({embeds: embed});

            return response.status(200).send(objectData);
        case 'charge.dispute.created':
            //if there was a disputed created, create an embed with the customers email address and the amount of the dispute
            let objectData = event.data.object

            embed.setColor('#6772e5')
            embed.setTitle("Dispute created")
            embed.addFields(
                {
                    name: "Email",
                    value: objectData.evidence.customer_email_address
                },
                {
                    name: "Amount",
                    value: new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: objectData.currency,
                    }).format(objectData.amount / 100)
                }
            )
            hook.send({embeds: embed});

            return response.status(200).send(objectData);
        default:
            //if the event type wasn't a charge the succeeded, failed, or was disputed, just print to the terminal and nothing else.
            console.log('Something else')
            return response.status(400).end();
    }
})

app.listen(8000, () => console.log('Running on port 8000'));
//hook.send("Stripe WebHook is now working");
