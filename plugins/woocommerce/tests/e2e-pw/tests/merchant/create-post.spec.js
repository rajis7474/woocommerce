const { test, expect, request } = require( '@playwright/test' );
const { admin } = require( '../../test-data/data' );

const postTitle = `Post-${ new Date().getTime().toString() }`;

test.describe( 'Can create a new post', () => {
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

		const allPosts = await test.step( `Get all posts.`, async () => {
			let response = await wpApi.get( `posts` );

			return await response.json();
		} );

		await test.step( `Clean up posts with title "${ postTitle }".`, async () => {
			await allPosts.forEach( async ( post ) => {
				if ( post.title.rendered === postTitle ) {
					await wpApi.delete( `posts/${ post.id }`, {
						data: {
							force: true,
						},
					} );
				}
			} );
		} );
	} );

	test( 'can create new post', async ( { page } ) => {
		await test.step( `Go to Posts > Add New.`, async () => {
			await page.goto( 'wp-admin/post-new.php' );
		} );

		await test.step( `Close welcome modal if visible.`, async () => {
			const welcomeModalVisible =
				await test.step( 'Check if the Welcome modal appeared', async () => {
					return await page
						.getByRole( 'heading', {
							name: 'Welcome to the block editor',
						} )
						.isVisible();
				} );

			if ( welcomeModalVisible ) {
				await test.step( 'Welcome modal appeared. Close it.', async () => {
					await page
						.getByRole( 'document' )
						.getByRole( 'button', { name: 'Close' } )
						.click();
				} );
			} else {
				await test.step( 'Welcome modal did not appear.', async () => {
					// do nothing.
				} );
			}
		} );

		await test.step( `Add title.`, async () => {
			await page
				.getByRole( 'textbox', { name: 'Add Title' } )
				.fill( postTitle );
		} );

		await test.step( `Add an empty block.`, async () => {
			await page
				.getByRole( 'button', { name: 'Add default block' } )
				.click();
		} );

		await test.step( `Fill block contents.`, async () => {
			await page
				.getByRole( 'document', {
					name: 'Empty block; start writing or type forward slash to choose a block',
				} )
				.fill( 'Test Post' );
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

		await test.step( `Expect the message "${ postTitle } is now live." to appear.`, async () => {
			await expect(
				page.getByText( `${ postTitle } is now live.` )
			).toBeVisible();
		} );
	} );
} );
