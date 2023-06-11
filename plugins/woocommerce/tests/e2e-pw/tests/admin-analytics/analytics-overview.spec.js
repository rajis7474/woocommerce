const { test, expect } = require( '@playwright/test' );

test.describe( 'Analytics pages', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	test.afterEach( async ( { page } ) => {
		await test.step( `Go to Analytics > Overview`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-admin&path=%2Fanalytics%2Foverview'
			);
		} );

		const sections =
			await test.step( `Grab all of the section headings`, async () => {
				return await page
					.locator( 'h2.woocommerce-section-header__title' )
					.count();
			} );

		await test.step( `Show Performance section if hidden`, async () => {
			if ( sections < 3 ) {
				// performance section is hidden
				await page
					.locator( '//button[@title="Add more sections"]' )
					.click();
				await page
					.locator( '//button[@title="Add Performance section"]' )
					.click();
				await expect(
					page.locator( 'h2:has-text("Performance")' )
				).toBeVisible();
				await page.waitForLoadState( 'networkidle' );
			}
		} );

		await test.step( `Rearrange sections if they are in the wrong order`, async () => {
			const lastSection = await page.textContent(
				'h2.woocommerce-section-header__title >> nth=2'
			);
			if ( lastSection === 'Performance' ) {
				// sections are in the wrong order
				await page
					.locator(
						'//button[@title="Choose which analytics to display and the section name"]'
					)
					.click();
				await page.locator( 'text=Move up' ).click();
				await page
					.locator(
						'//button[@title="Choose which analytics to display and the section name"]'
					)
					.click();
				await page.locator( 'text=Move up' ).click();

				// wait for the changes to be saved
				await page.waitForResponse(
					( response ) =>
						response.url().includes( '/users/' ) &&
						response.status() === 200
				);
			}
		} );
	} );

	test( 'a user should see 3 sections by default - Performance, Charts, and Leaderboards', async ( {
		page,
	} ) => {
		const arrExpectedSections =
			await test.step( `Create an array of the sections we're expecting to find.`, async () => {
				return [ 'Charts', 'Leaderboards', 'Performance' ];
			} );

		await test.step( `Go to Analytics > Overview`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-admin&path=%2Fanalytics%2Foverview'
			);
		} );

		await test.step( `Expect that each section is visible and in the correct order`, async () => {
			for ( const expectedSection of arrExpectedSections ) {
				await test.step( `Assert that the "${ expectedSection }" section is visible`, async () => {
					await expect(
						page.locator( 'h2.woocommerce-section-header__title', {
							hasText: expectedSection,
						} )
					).toBeVisible();
				} );
			}
		} );
	} );

	test.describe( 'moving sections', () => {
		test.use( { storageState: process.env.ADMINSTATE } );

		test( 'should not display move up for the top, or move down for the bottom section', async ( {
			page,
		} ) => {
			await test.step( `Go to Analytics > Overview`, async () => {
				await page.goto(
					'wp-admin/admin.php?page=wc-admin&path=%2Fanalytics%2Foverview'
				);
			} );

			await test.step( `Expect the topmost section only shows the 'Move down' button`, async () => {
				await page
					.locator( 'button.woocommerce-ellipsis-menu__toggle' )
					.first()
					.click();
				await expect(
					page.locator( 'text=Move up' )
				).not.toBeVisible();
				await expect( page.locator( 'text=Move down' ) ).toBeVisible();
				await page.keyboard.press( 'Escape' );
			} );

			await test.step( `Expect the bottommost section only shows the 'Move up' button`, async () => {
				await page
					.locator( 'button.woocommerce-ellipsis-menu__toggle' )
					.last()
					.click();
				await expect(
					page.locator( 'text=Move down' )
				).not.toBeVisible();
				await expect( page.locator( 'text=Move up' ) ).toBeVisible();
				await page.keyboard.press( 'Escape' );
			} );
		} );

		test( 'should allow a user to move a section down', async ( {
			page,
		} ) => {
			await test.step( `Go to Analytics > Overview`, async () => {
				await page.goto(
					'wp-admin/admin.php?page=wc-admin&path=%2Fanalytics%2Foverview'
				);
			} );

			const { firstSection, secondSection } =
				await test.step( `Get the first and second sections`, async () => {
					const firstSection = await page
						.locator(
							'h2.woocommerce-section-header__title >> nth=0'
						)
						.innerText();

					const secondSection = await page
						.locator(
							'h2.woocommerce-section-header__title >> nth=1'
						)
						.innerText();

					return { firstSection, secondSection };
				} );

			await test.step( `Move the first section down`, async () => {
				await page
					.locator(
						'button.components-button.woocommerce-ellipsis-menu__toggle >> nth=0'
					)
					.click();
				await page.locator( 'text=Move down' ).click();
			} );

			await test.step( `Expect the second section becomes first`, async () => {
				await expect(
					page.locator(
						'h2.woocommerce-section-header__title >> nth=0'
					)
				).toHaveText( secondSection );
			} );

			await test.step( `Expect the first section becomes second`, async () => {
				await expect(
					page.locator(
						'h2.woocommerce-section-header__title >> nth=1'
					)
				).toHaveText( firstSection );
			} );
		} );

		test( 'should allow a user to move a section up', async ( {
			page,
		} ) => {
			await test.step( `Go to Analytics > Overview`, async () => {
				await page.goto(
					'wp-admin/admin.php?page=wc-admin&path=%2Fanalytics%2Foverview'
				);
			} );

			const { firstSection, secondSection } =
				await test.step( `Get the first and second sections`, async () => {
					const firstSection = await page
						.locator(
							'h2.woocommerce-section-header__title >> nth=0'
						)
						.innerText();

					const secondSection = await page
						.locator(
							'h2.woocommerce-section-header__title >> nth=1'
						)
						.innerText();

					return { firstSection, secondSection };
				} );

			await test.step( `Move the second section up.`, async () => {
				await page
					.locator(
						'button.components-button.woocommerce-ellipsis-menu__toggle >> nth=1'
					)
					.click();
				await page.locator( 'text=Move up' ).click();
			} );

			await test.step( `Expect second section becomes first.`, async () => {
				await expect(
					page.locator(
						'h2.woocommerce-section-header__title >> nth=0'
					)
				).toHaveText( secondSection );
			} );

			await test.step( `Expect first section becomes second.`, async () => {
				await expect(
					page.locator(
						'h2.woocommerce-section-header__title >> nth=1'
					)
				).toHaveText( firstSection );
			} );
		} );
	} );

	test( 'should allow a user to remove a section', async ( { page } ) => {
		await test.step( `Go to Analytics > Overview.`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-admin&path=%2Fanalytics%2Foverview'
			);
		} );

		await test.step( `Click the first button to the right of the Performance heading`, async () => {
			await page
				.locator( 'button:right-of(:text("Performance")) >> nth=0' )
				.click();
			await page.locator( 'text=Remove section' ).click();
			await page.waitForLoadState( 'networkidle' );
		} );

		const sections =
			await test.step( `Grab all of the section headings`, async () => {
				return page.locator( 'h2.woocommerce-section-header__title' );
			} );

		await test.step( `Expect the number of sections to be 2.`, async () => {
			await expect( sections ).toHaveCount( 2 );
		} );
	} );

	test( 'should allow a user to add a section back in', async ( {
		page,
	} ) => {
		await test.step( `Go to Analytics > Overview.`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-admin&path=%2Fanalytics%2Foverview'
			);
		} );

		await test.step( `Button only shows when not all sections visible, so remove a section`, async () => {
			await page
				.locator( 'button:right-of(:text("Performance")) >> nth=0' )
				.click();
			await page.locator( 'text=Remove section' ).click();
		} );

		await test.step( `Add Performance section`, async () => {
			await page
				.locator( '//button[@title="Add more sections"]' )
				.click();
			await page
				.locator( '//button[@title="Add Performance section"]' )
				.click();
		} );

		await test.step( `Expect the Performance section to be visible`, async () => {
			await expect(
				page.locator( 'h2.woocommerce-section-header__title >> nth=2' )
			).toContainText( 'Performance' );
		} );
	} );
} );
