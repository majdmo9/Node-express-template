/* eslint-disable camelcase */
import { join } from 'path';
import { readFileSync } from 'fs';
import express from 'express';
import serveStatic from 'serve-static';
import dotenv from 'dotenv';

import shopify from './shopify.js';
import webhooks from './webhooks.js';
import prisma from './prisma/index.js';

dotenv.config();

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT, 10);

const STATIC_PATH =
	process.env.NODE_ENV === 'production'
		? `${process.cwd()}/frontend/dist`
		: `${process.cwd()}/frontend/`;

const app = express();
app.use(express.json());

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
	shopify.config.auth.callbackPath,
	shopify.auth.callback(),
	shopify.redirectToShopifyOrAppRoot()
);
app.post(
	shopify.config.webhooks.path,
	// @ts-ignore
	shopify.processWebhooks({ webhookHandlers: webhooks })
);

// Retrieve saved cart
app.get('/api/saved-cart', async (req, res) => {
	const { customer_id: customerId } = req.query;

	try {
		const savedCart = await prisma.savedCart.findUnique({
			where: { customerId },
		});

		if (!savedCart) {
			return res.status(404).json({ error: 'Saved cart not found' });
		}

		res.status(200).json(savedCart);
	} catch (err) {
		console.error('Error retrieving saved cart:', err);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// All endpoints after this point will require an active session
app.use('/api/*', shopify.validateAuthenticatedSession());

// Save cart (Create a new table row or Update an existing row)
app.post('/api/save-cart', async (req, res) => {
	const { products, customer_id } = req.body;
	const customerId = customer_id.split('/').pop();

	try {
		await prisma.savedCart.upsert({
			where: { customerId },
			update: { productVariants: products },
			create: {
				customerId,
				productVariants: products,
			},
		});
		res.status(200).send('Success!');
	} catch (err) {
		console.error('Error saving cart:', err);
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.use(serveStatic(STATIC_PATH, { index: false }));

app.use('/*', shopify.ensureInstalledOnShop(), async (req, res, next) => {
	try {
		return res.set('Content-Type', 'text/html').send(readFileSync(join(STATIC_PATH, 'index.html')));
	} catch (error) {
		console.error('Error in ensureInstalledOnShop:', error);
		next(error);
	}
});

// Error handler
app.use((err, req, res) => {
	console.error(err.stack);
	res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
