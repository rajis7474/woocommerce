/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import {
	__experimentalWooProductTabItem as WooProductTabItem,
	__experimentalWooProductSectionItem as WooProductSectionItem,
} from '@woocommerce/components';
import { PartialProduct } from '@woocommerce/data';

/**
 * Internal dependencies
 */
import { ProductVariationDetailsSection } from '../sections/product-variation-details-section';
import {
	TAB_INVENTORY_ID,
	VARIANT_TAB_SHIPPING_ID,
	VARIANT_SHIPPING_SECTION_BASIC_ID,
	VARIANT_SHIPPING_SECTION_DIMENSIONS_ID,
	VARIANT_TAB_PRICING_ID,
	VARIANT_PRICING_SECTION_BASIC_ID,
	VARIANT_PRICING_SECTION_TAXES_ID,
} from './constants';
import { ShippingSectionFills } from './shipping-section';
import { PricingSectionFills } from './pricing-section';

const tabPropData = {
	general: {
		name: 'general',
		title: __( 'General', 'woocommerce' ),
	},
	pricing: {
		name: 'pricing',
		title: __( 'Pricing', 'woocommerce' ),
	},
	inventory: {
		name: 'inventory',
		title: __( 'Inventory', 'woocommerce' ),
	},
	shipping: {
		name: 'shipping',
		title: __( 'Shipping', 'woocommerce' ),
	},
	options: {
		name: 'options',
		title: __( 'Options', 'woocommerce' ),
	},
};

const Tabs = () => {
	return (
		<>
			<WooProductTabItem
				id="tab/general/variation"
				templates={ [ { name: 'tab/variation', order: 1 } ] }
				pluginId="core"
				tabProps={ tabPropData.general }
			>
				<ProductVariationDetailsSection />
			</WooProductTabItem>
			<WooProductTabItem
				id="tab/pricing"
				templates={ [ { name: 'tab/variation', order: 3 } ] }
				pluginId="core"
				tabProps={ tabPropData.pricing }
			>
				<WooProductSectionItem.Slot tab={ VARIANT_TAB_PRICING_ID } />
			</WooProductTabItem>
			<WooProductTabItem
				id="tab/inventory"
				templates={ [ { name: 'tab/variation', order: 5 } ] }
				pluginId="core"
				tabProps={ tabPropData.inventory }
			>
				<WooProductSectionItem.Slot tab={ TAB_INVENTORY_ID } />
			</WooProductTabItem>
			<WooProductTabItem
				id={ VARIANT_TAB_SHIPPING_ID }
				templates={ [ { name: 'tab/variation', order: 7 } ] }
				pluginId="core"
				tabProps={ tabPropData.shipping }
			>
				{ ( { product }: { product: PartialProduct } ) => (
					<WooProductSectionItem.Slot
						tab={ VARIANT_TAB_SHIPPING_ID }
						fillProps={ { product } }
					/>
				) }
			</WooProductTabItem>
		</>
	);
};

/**
 * Preloading product form data, as product pages are waiting on this to be resolved.
 * The above Form component won't get rendered until the getProductForm is resolved.
 */
registerPlugin( 'wc-admin-product-editor-form-variation-fills', {
	// @ts-expect-error 'scope' does exist. @types/wordpress__plugins is outdated.
	scope: 'woocommerce-product-editor',
	render: () => {
		return (
			<>
				<Tabs />
				<ShippingSectionFills
					tabId={ VARIANT_TAB_SHIPPING_ID }
					basicSectionId={ VARIANT_SHIPPING_SECTION_BASIC_ID }
					dimensionsSectionId={
						VARIANT_SHIPPING_SECTION_DIMENSIONS_ID
					}
				/>
				<PricingSectionFills
					tabId={ VARIANT_TAB_PRICING_ID }
					basicSectionId={ VARIANT_PRICING_SECTION_BASIC_ID }
					taxesSectionId={ VARIANT_PRICING_SECTION_TAXES_ID }
				/>
			</>
		);
	},
} );