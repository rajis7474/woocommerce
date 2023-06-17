const { test, expect, Page } = require( '@playwright/test' );
const { async } = require( 'regenerator-runtime' );
const wcApi = require( '@woocommerce/woocommerce-rest-api' ).default;

const randomNum = Date.now().toString();
const searchString = `James Doe ${ randomNum }`;
const itemName = 'Wanted Product';

const customerBilling = {
	first_name: 'James',
	last_name: `Doe ${ randomNum }`,
	company: 'Automattic',
	country: 'US',
	address_1: 'address1',
	address_2: 'address2',
	city: 'San Francisco',
	state: 'CA',
	postcode: '94107',
	phone: '123456789',
	email: `john.doe.ordersearch.${ randomNum }@example.com`,
};

const customerShipping = {
	first_name: 'Tim',
	last_name: 'Clark',
	company: 'Automattic',
	country: 'US',
	address_1: 'Oxford Ave',
	address_2: 'Linwood Ave',
	city: 'Buffalo',
	state: 'NY',
	postcode: '14201',
	phone: '123456789',
};

const queries = [
	[ customerBilling.first_name, 'billing first name' ],
	[ customerBilling.last_name, 'billing last name' ],
	[ customerBilling.company, 'billing company name' ],
	[ customerBilling.address_1, 'billing first address' ],
	[ customerBilling.address_2, 'billing second address' ],
	[ customerBilling.city, 'billing city name' ],
	[ customerBilling.postcode, 'billing post code' ],
	[ customerBilling.email, 'billing email' ],
	[ customerBilling.phone, 'billing phone' ],
	[ customerBilling.state, 'billing state' ],
	[ customerShipping.first_name, 'shipping first name' ],
	[ customerShipping.last_name, 'shipping last name' ],
	[ customerShipping.address_1, 'shipping first address' ],
	[ customerShipping.address_2, 'shipping second address' ],
	[ customerShipping.city, 'shipping city name' ],
	[ customerShipping.postcode, 'shipping post code' ],
	[ itemName, 'shipping item name' ],
];

/**
 * @param {Page} page
 */
const goToOrdersPage = async ( page ) => {
	await test.step( `Go to WooCommerce > Orders`, async () => {
		await page.goto( 'wp-admin/edit.php?post_type=shop_order' );
	} );
};

/**
 * @param {Page} page
 */
const initiateSearch = async ( page, searchTerm ) => {
	await test.step( `Enter search term "${ searchTerm }".`, async () => {
		await page.locator( '[type=search][name=s]' ).fill( searchTerm );
	} );

	await test.step( `Click 'Search orders'.`, async () => {
		await page.locator( '#search-submit' ).click();
	} );
};

/**
 * @param {Page} page
 */
const verifyResults = async ( page ) => {
	await test.step( `Expect search results to show the order.`, async () => {
		await expect(
			page.getByText( `#${ orderId } ${ searchString }` )
		).toBeVisible();
	} );
};

let productId, customerId, orderId;

test.describe( 'WooCommerce Orders > Search orders', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	test.beforeAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );

		await test.step( `Create a simple product`, async () => {
			await api
				.post( 'products', {
					name: 'Wanted Product',
					type: 'simple',
					regular_price: '7.99',
				} )
				.then( ( response ) => {
					productId = response.data.id;
				} );
		} );

		await test.step( `Create test customer.`, async () => {
			await api
				.post( 'customers', {
					email: customerBilling.email,
					first_name: customerBilling.first_name,
					last_name: customerBilling.last_name,
					username: `john.doe.${ randomNum }`,
					billing: customerBilling,
					shipping: customerShipping,
				} )
				.then( ( response ) => {
					customerId = response.data.id;
				} );
		} );

		await test.step( `Create order`, async () => {
			await api
				.post( 'orders', {
					line_items: [
						{
							product_id: productId,
							quantity: 1,
						},
					],
					customer_id: customerId,
					billing: customerBilling,
					shipping: customerShipping,
				} )
				.then( ( response ) => {
					orderId = response.data.id;
				} );
		} );
	} );

	test.afterAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );
		await test.step( `Delete test product`, async () => {
			await api.delete( `products/${ productId }`, { force: true } );
		} );

		await test.step( `Delete test order`, async () => {
			await api.delete( `orders/${ orderId }`, { force: true } );
		} );

		await test.step( `Delete test customer`, async () => {
			await api.delete( `customers/${ customerId }`, { force: true } );
		} );
	} );

	test( 'can search for order by order id', async ( { page } ) => {
		await goToOrdersPage( page );

		await initiateSearch( page, orderId.toString() );

		await verifyResults( page );
	} );

	for ( const [ searchTerm, criteria ] of queries ) {
		test( `can search for order by ${ criteria }`, async ( { page } ) => {
			await goToOrdersPage( page );

			await initiateSearch( page, searchTerm );

			await verifyResults( page );
		} );
	}
} );
