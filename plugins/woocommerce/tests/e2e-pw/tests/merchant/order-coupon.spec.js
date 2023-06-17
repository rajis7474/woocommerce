const { test, expect } = require( '@playwright/test' );
const wcApi = require( '@woocommerce/woocommerce-rest-api' ).default;

let productId, couponId, orderId;

const productPrice = '9.99';
const productName = 'Apply Coupon Product';
const couponCode = '5off';
const couponAmount = '5';
const discountedPrice = ( productPrice - couponAmount ).toString();

test.describe( 'WooCommerce Orders > Apply Coupon', () => {
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
					name: productName,
					type: 'simple',
					regular_price: productPrice,
				} )
				.then( ( response ) => {
					productId = response.data.id;
				} );
		} );

		await test.step( `Create a $5 off coupon`, async () => {
			await api
				.post( 'coupons', {
					code: couponCode,
					discount_type: 'fixed_product',
					amount: couponAmount,
				} )
				.then( ( response ) => {
					couponId = response.data.id;
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
					coupon_lines: [
						{
							code: couponCode,
						},
					],
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

		await test.step( `Clean up product, coupon and order after run`, async () => {
			await api.delete( `products/${ productId }`, { force: true } );
			await api.delete( `coupons/${ couponId }`, { force: true } );
			await api.delete( `orders/${ orderId }`, { force: true } );
		} );
	} );

	test( 'can apply a coupon', async ( { page } ) => {
		await test.step( `Go to "Add new order" page.`, async () => {
			await page.goto( 'wp-admin/post-new.php?post_type=shop_order' );
		} );

		await test.step( `Open modal for adding line items`, async () => {
			await page.locator( 'button.add-line-item' ).click();
			await page.locator( 'button.add-order-item' ).click();
		} );

		await test.step( `Search for product to add.`, async () => {
			await page.locator( 'text=Search for a product…' ).click();
			await page
				.locator( '.select2-search--dropdown' )
				.getByRole( 'combobox' )
				.type( productName );
			await page
				.locator(
					'li.select2-results__option.select2-results__option--highlighted'
				)
				.click();
		} );

		await test.step( `Click 'Add'.`, async () => {
			await page.locator( 'button#btn-ok' ).click();
		} );

		await test.step( `Apply coupon.`, async () => {
			page.on( 'dialog', ( dialog ) => dialog.accept( couponCode ) );
			await page.locator( 'button.add-coupon' ).click();
		} );

		await test.step( `Expect coupon code to appear on coupon list.`, async () => {
			await expect(
				page.locator( '.wc_coupon_list li', { hasText: couponCode } )
			).toBeVisible();
		} );

		await test.step( `Expect 'Coupon(s)' line to be displayed.`, async () => {
			await expect(
				page.locator( '.wc-order-totals td.label >> nth=1' )
			).toContainText( 'Coupon(s)' );
		} );

		await test.step( `Expect 'Order Total' line to be displayed.`, async () => {
			await expect(
				page.locator( '.wc-order-totals td.label >> nth=2' )
			).toContainText( 'Order Total' );
		} );

		await test.step( `Expect coupon amount to be correct.`, async () => {
			await expect(
				page.locator( '.wc-order-totals td.total >> nth=1' )
			).toContainText( couponAmount );
		} );

		await test.step( `Expect discounted price to be correct.`, async () => {
			await expect(
				page.locator( '.wc-order-totals td.total >> nth=2' )
			).toContainText( discountedPrice );
		} );
	} );

	test( 'can remove a coupon', async ( { page } ) => {
		await test.step( `Go to "Edit order" page of order ID ${ orderId }.`, async () => {
			await page.goto(
				`/wp-admin/post.php?post=${ orderId }&action=edit`
			);
		} );

		await test.step( `Expect "${ couponCode }" to appear in the list of coupons applied.`, async () => {
			await expect(
				page.locator( '.wc_coupon_list li', {
					hasText: couponCode,
				} )
			).toBeVisible();
		} );

		await test.step( `Remove coupon.`, async () => {
			await page.locator( 'a.remove-coupon' ).dispatchEvent( 'click' );
		} );

		await test.step( `Expect coupon code "${ couponCode }" to be removed.`, async () => {
			await expect(
				page.locator( '.wc_coupon_list li', { hasText: couponCode } )
			).not.toBeVisible();
		} );

		await test.step( `Expect order total to be equal to the product price.`, async () => {
			await expect(
				page.locator( '.wc-order-totals td.total >> nth=1' )
			).toContainText( productPrice );
		} );
	} );
} );
