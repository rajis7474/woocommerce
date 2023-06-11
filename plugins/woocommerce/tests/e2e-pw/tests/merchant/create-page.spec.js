const { test, expect, request } = require( '@playwright/test' );
const { admin } = require( '../../test-data/data' );

const pageTitle = `Page-${ new Date().getTime().toString() }`;

test.describe( 'Can create a new page', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	test.afterAll( async ( { baseURL } ) => {
		const base64auth = Buffer.from(
			`${ admin.username }:${ admin.password }`
		).toString( 'base64' );
		const wpApi = await request.newContext( {
			baseURL: `${ baseURL }/wp-json/wp/v2/`,
			extraHTTPHeaders: {
				Authorization: `Basic ${ base64auth }`,
			},
		} );

		let response = await test.step( `Get all pages`, async () => {
			return await wpApi.get( `pages` );
		} );

		await test.step( `Delete pages with title "${ pageTitle }".`, async () => {
			const allPages = await response.json();

			await allPages.forEach( async ( page ) => {
				if ( page.title.rendered === pageTitle ) {
					response = await wpApi.delete( `pages/${ page.id }`, {
						data: {
							force: true,
						},
					} );
				}
			} );
		} );
	} );

	test( 'can create new page', async ( { page } ) => {
		await test.step( `Go to Pages > Add new.`, async () => {
			await page.goto( 'wp-admin/post-new.php?post_type=page' );
		} );

		await test.step( `Close welcome modal if visible.`, async () => {
			const welcomeModalVisible = await page
				.getByRole( 'heading', {
					name: 'Welcome to the block editor',
				} )
				.isVisible();

			if ( welcomeModalVisible ) {
				await page.getByRole( 'button', { name: 'Close' } ).click();
			}
		} );

		await test.step( `Fill page title.`, async () => {
			await page
				.getByRole( 'textbox', { name: 'Add Title' } )
				.fill( pageTitle );
		} );

		await test.step( `Add an empty block.`, async () => {
			await page
				.getByRole( 'button', { name: 'Add default block' } )
				.click();
		} );

		await test.step( `Fill block contents`, async () => {
			await page
				.getByRole( 'document', {
					name: 'Empty block; start writing or type forward slash to choose a block',
				} )
				.fill( 'Test Page' );
		} );

		await test.step( `Click 'Publish' from the header.`, async () => {
			await page
				.getByRole( 'button', { name: 'Publish', exact: true } )
				.click();
		} );

		await test.step( `Click 'Publish' from the sliding panel.`, async () => {
			await page
				.getByRole( 'region', { name: 'Editor publish' } )
				.getByRole( 'button', { name: 'Publish', exact: true } )
				.click();
		} );

		await test.step( `Expect the success message "${ pageTitle } is now live." to appear.`, async () => {
			await expect(
				page.getByText( `${ pageTitle } is now live.` )
			).toBeVisible();
		} );
	} );
} );
