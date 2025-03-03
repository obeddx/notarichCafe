<button
          onClick={() => {
            setSelectedTableNumberForOrder(selectedTableNumber);
            setIsOrderModalOpen(true);
          }}
          className="bg-[#FF8A00] text-white px-4 py-2 rounded-lg hover:bg-[#FF6A00] transition-colors flex-1 text-center"
        >
          Pesan Sekarang
        </button>

useEffect(() => {
    const fetchMenusAndDiscounts = async () => {
      try {
        const menuResponse = await fetch("/api/getMenu");
        if (!menuResponse.ok) throw new Error(`Failed to fetch menus: ${menuResponse.status}`);
        const menuData = await menuResponse.json();
        setMenus(menuData);

        const discountResponse = await fetch("/api/diskon");
        if (!discountResponse.ok) throw new Error(`Failed to fetch discounts: ${discountResponse.status}`);
        const discountData = await discountResponse.json();
        setDiscounts(discountData.filter((d: Discount) => d.isActive));
      } catch (error) {
        console.error("Error fetching menus or discounts:", error);
      }
    };
    fetchMenusAndDiscounts();
    fetchOrders();
  }, []);

  useEffect(() => {
    const socketIo = io(SOCKET_URL, {
      path: "/api/socket",
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 5000,
    });
  
    socketIo.on("connect", () => console.log("Terhubung ke WebSocket server:", socketIo.id));
  
    socketIo.on("ordersUpdated", (data: any) => {
      console.log("Pesanan baru atau dihapus:", data);
      fetchOrders();
    });
  
    socketIo.on("paymentStatusUpdated", (updatedOrder: Order) => {
      console.log("Status pembayaran diperbarui:", updatedOrder);
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === updatedOrder.id
            ? {
                ...order,
                ...updatedOrder,
                paymentStatusText:
                  updatedOrder.paymentStatus === "paid" && updatedOrder.paymentMethod === "ewallet"
                    ? "Status Payment: Paid via E-Wallet"
                    : order.paymentStatusText,
              }
            : order
        )
      );
    });
  
    socketIo.on("reservationDeleted", ({ reservasiId, orderId }) => {
      console.log("Reservasi dihapus:", { reservasiId, orderId });
      setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId));
      fetchOrders();
    });
  
    socketIo.on("reservationUpdated", (updatedReservasi) => {
      console.log("Reservasi diperbarui:", updatedReservasi);
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.reservasi?.id === updatedReservasi.id
            ? { ...order, reservasi: updatedReservasi }
            : order
        )
      );
    });
  
    // Tambahkan listener untuk perubahan status meja
    socketIo.on("tableStatusUpdated", ({ tableNumber }) => {
      fetchOrders();
    });
  
    socketIo.on("disconnect", () => console.log("Socket terputus"));
  
    setSocket(socketIo);
  
    return () => {
      socketIo.disconnect();
      console.log("WebSocket disconnected");
    };
  }, []);