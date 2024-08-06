import {
	reactExtension,
	Banner,
	BlockStack,
	Checkbox,
	useApi,
	Pressable,
	Button,
} from '@shopify/ui-extensions-react/checkout';
import { useEffect, useState } from 'react';
import { Product } from './types/product';

// 1. Choose an extension target
export default reactExtension('purchase.checkout.block.render', () => <Extension />);

function Extension() {
	const {
		lines,
		sessionToken,
		extension,
		buyerIdentity: { customer },
	} = useApi();

	const [products, setProducts] = useState<Record<string, Product>>({});
	const [loading, setLoading] = useState(false);
	const [saved, setSaved] = useState(false);
	// Update the products object on checking/unchecking a product for saving
	const handleProductCheck = (id: string) => {
		if (saved) {
			setSaved(false);
		}
		setProducts((prev) => ({ ...prev, [id]: { ...prev[id], checked: !prev[id].checked } }));
	};
	// Send a post request to the backend api to save the selected products in the database table
	const handleSave = async () => {
		try {
			// Map the checked products object to an array of objects that holds {id:string, quantity:number}
			const productsList = Object.entries(products)
				.map(([key, value]) =>
					value.checked
						? { id: key.split('/')[key.split('/').length - 1], quantity: value.quantity }
						: ''
				)
				.filter(Boolean);

			setLoading(true);
			const token = await sessionToken.get();
			await fetch(`${extension.scriptUrl.split('/extensions')[0]}/api/save-cart`, {
				method: 'POST',
				body: JSON.stringify({ products: productsList, customer_id: customer.current.id }),
				headers: {
					Authorization: 'Bearer ' + token.toString(),
					'Content-Type': 'application/json',
				},
			});
			setSaved(true);
		} catch (err) {
			console.log({ err });
		} finally {
			setLoading(false);
		}
	};
	// Fetch the checkout products on render
	useEffect(() => {
		const mappedProducts = lines.current.map((line) => ({
			id: line.merchandise.id,
			title: line.merchandise.title,
			checked: false,
			quantity: line.quantity,
		}));
		const productsObj: Record<string, Product> = {};
		for (const product of mappedProducts) {
			productsObj[product.id] = {
				title: product.title,
				checked: product.checked,
				quantity: product.quantity,
			};
		}
		setProducts(productsObj);
	}, []);

	// 3. Render a UI
	return (
		<BlockStack border={'base'} borderRadius="base" padding={'tight'}>
			<Banner title="Save your cart">
				{Object.entries(products).map(([key, product]) => (
					<Pressable key={key}>
						<Checkbox onChange={() => handleProductCheck(key)}>{product.title}</Checkbox>
					</Pressable>
				))}
			</Banner>
			<Button
				loading={loading}
				onPress={handleSave}
				disabled={Object.values(products).every((el) => !el.checked) || loading || saved}
			>
				{saved ? 'Cart Saved' : 'Save Cart'}
			</Button>
		</BlockStack>
	);
}
