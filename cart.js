(() => {
	const storageKey = "doceria-da-barra-cart";
	const whatsappNumber = "552124561955";
	let memoryCart = [];

	const normalizeCart = (items) => {
		if (!Array.isArray(items)) return [];
		return items.filter((item) => item
			&& typeof item.id === "string"
			&& typeof item.name === "string"
			&& Number.isFinite(Number(item.price))
			&& Number(item.price) >= 0
			&& Number.isInteger(Number(item.quantity))
			&& Number(item.quantity) > 0
			&& typeof item.image === "string"
			&& /^imagens\/[\w.-]+\.(?:jfif|jpe?g|png|webp)$/i.test(item.image))
			.map((item) => ({
				id: item.id,
				name: item.name,
				price: Number(item.price),
				quantity: Number(item.quantity),
				image: item.image
			}));
	};

	const readCart = () => {
		try {
			const stored = localStorage.getItem(storageKey);
			return stored ? normalizeCart(JSON.parse(stored)) : memoryCart;
		} catch {
			return memoryCart;
		}
	};

	const updateCartLink = (items) => {
		const link = document.querySelector("[data-cart-link]");
		if (!link) return;
		const url = new URL("carrinho.html", window.location.href);
		url.searchParams.set("items", JSON.stringify(items));
		link.href = url.href;
	};

	const formatPrice = (amount) => new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL"
	}).format(amount);

	const setCart = (items) => {
		memoryCart = normalizeCart(items);
		try {
			localStorage.setItem(storageKey, JSON.stringify(memoryCart));
		} catch {
			// O estado em memória e o link do carrinho continuam funcionando sem armazenamento local.
		}
		renderCart();
	};

	const createQuantityButton = (label, symbol, onClick) => {
		const button = document.createElement("button");
		button.type = "button";
		button.setAttribute("aria-label", label);
		button.textContent = symbol;
		button.addEventListener("click", onClick);
		return button;
	};

	const createCartItem = (item) => {
		const row = document.createElement("article");
		row.className = "cart-item";

		const image = document.createElement("img");
		image.className = "cart-item-image";
		image.src = item.image;
		image.alt = item.name;

		const info = document.createElement("div");
		info.className = "cart-item-info";
		const title = document.createElement("h2");
		title.textContent = item.name;
		const price = document.createElement("p");
		price.className = "cart-item-price";
		price.textContent = `${formatPrice(item.price)} cada`;

		const controls = document.createElement("div");
		controls.className = "cart-item-controls";
		const quantityControl = document.createElement("div");
		quantityControl.className = "quantity-control";
		const quantity = document.createElement("span");
		quantity.className = "quantity-value";
		quantity.textContent = String(item.quantity);
		quantityControl.append(
			createQuantityButton(`Diminuir ${item.name}`, "−", () => changeQuantity(item.id, -1)),
			quantity,
			createQuantityButton(`Aumentar ${item.name}`, "+", () => changeQuantity(item.id, 1))
		);
		const remove = document.createElement("button");
		remove.className = "remove-item";
		remove.type = "button";
		remove.textContent = "Remover";
		remove.setAttribute("aria-label", `Remover ${item.name} do carrinho`);
		remove.addEventListener("click", () => setCart(readCart().filter((entry) => entry.id !== item.id)));
		controls.append(quantityControl, remove);
		info.append(title, price, controls);

		const lineTotal = document.createElement("strong");
		lineTotal.className = "cart-item-total";
		lineTotal.textContent = formatPrice(item.price * item.quantity);
		row.append(image, info, lineTotal);
		return row;
	};

	const updateCartUrl = (items) => {
		if (document.body.dataset.page !== "cart") return;
		try {
			const url = new URL(window.location.href);
			url.searchParams.set("items", JSON.stringify(items));
			window.history.replaceState(null, "", url.href);
		} catch {
			// O carrinho segue disponível na página atual mesmo quando a URL local não pode ser atualizada.
		}
	};

	function changeQuantity(id, amount) {
		const items = readCart().map((item) => item.id === id
			? { ...item, quantity: Math.max(1, item.quantity + amount) }
			: item);
		setCart(items);
	}

	function renderCart() {
		const items = readCart();
		const count = items.reduce((sum, item) => sum + item.quantity, 0);
		document.querySelectorAll("[data-cart-count]").forEach((badge) => {
			badge.textContent = String(count);
		});
		updateCartLink(items);

		const itemsElement = document.getElementById("cart-items");
		if (!itemsElement) return;

		const emptyElement = document.getElementById("cart-empty");
		const layoutElement = document.getElementById("cart-layout");
		const checkoutLink = document.getElementById("checkout-link");
		const subtotalElement = document.getElementById("cart-subtotal");
		const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

		itemsElement.replaceChildren(...items.map(createCartItem));
		emptyElement.hidden = items.length > 0;
		layoutElement.hidden = items.length === 0;
		subtotalElement.textContent = formatPrice(total);
		checkoutLink.setAttribute("aria-disabled", String(items.length === 0));
		checkoutLink.href = items.length
			? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Gostaria de fazer este pedido na Doceria da Barra:\n${items.map((item) => `- ${item.quantity}x ${item.name}: ${formatPrice(item.price * item.quantity)}`).join("\n")}\n\nTotal: ${formatPrice(total)}`)}`
			: "#";
		updateCartUrl(items);
	}

	document.querySelectorAll("[data-add-to-cart]").forEach((button) => {
		button.addEventListener("click", () => {
			const items = readCart();
			const id = button.dataset.productId;
			const existing = items.find((item) => item.id === id);
			if (existing) {
				existing.quantity += 1;
			} else {
				items.push({
					id,
					name: button.dataset.productName,
					price: Number(button.dataset.productPrice),
					quantity: 1,
					image: button.dataset.productImage
				});
			}
			setCart(items);
			const feedback = document.querySelector("[data-cart-feedback]");
			if (feedback) feedback.textContent = `${button.dataset.productName} adicionado ao carrinho.`;
		});
	});

	const params = new URLSearchParams(window.location.search);
	const queryItems = params.get("items");
	if (document.body.dataset.page === "cart" && queryItems !== null) {
		try {
			memoryCart = normalizeCart(JSON.parse(queryItems));
			try {
				localStorage.setItem(storageKey, JSON.stringify(memoryCart));
			} catch {
				// O conteúdo recebido pelo link permanece disponível em memória.
			}
		} catch {
			memoryCart = [];
		}
	} else {
		memoryCart = readCart();
	}

	const clearButton = document.getElementById("clear-cart");
	if (clearButton) clearButton.addEventListener("click", () => setCart([]));

	window.addEventListener("storage", renderCart);
	renderCart();
})();