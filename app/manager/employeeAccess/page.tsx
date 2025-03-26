"use client";

import { useState, useEffect, FormEvent } from "react";
import Sidebar from "@/components/sidebar";

// 1. Import React Toastify
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface EmployeeAssigned {
  id: number;
  firstName: string;
  lastName: string;
}

interface RoleEmployee {
  id: number;
  name: string;
  employees: EmployeeAssigned[];
  permissions: string[]; // Array permission keys, misal: "app.cashier", "backoffice.viewInventory.summary"
  appPermissions?: AppPermissions; // Opsional untuk kompatibilitas ke belakang
  backofficePermissions?: BackofficePermissions; // Opsional untuk kompatibilitas ke belakang
}

// Struktur data untuk App Permissions
interface AppPermissions {
  cashier: boolean;
  menus: boolean;
  layoutCafe: boolean;
  riwayat: boolean;
  reservasi: boolean;
}

// Struktur data untuk Backoffice Permissions dengan parent checkbox
interface BackofficePermissions {
  // Single checkbox (tanpa children)
  viewDashboard: boolean;

  // View Reports
  viewReportsParent: boolean;
  viewReports: {
    sales: boolean;
    transactions: boolean;
  };

  // View Menu
  viewMenuParent: boolean;
  viewMenu: {
    daftarMenu: boolean;
    kategoriMenu: boolean;
  };

  // View Library
  viewLibraryParent: boolean;
  viewLibrary: {
    bundles: boolean;
    taxes: boolean;
    gratuity: boolean;
    discount: boolean;
  };

  // View Modifier
  viewModifierParent: boolean;
  viewModifier: {
    modifier: boolean;
    category: boolean;
  };

  // View Ingredients
  viewIngredientsParent: boolean;
  viewIngredients: {
    ingredientsLibrary: boolean;
    ingredientsCategory: boolean;
    recipes: boolean;
  };

  // View Inventory
  viewInventoryParent: boolean;
  viewInventory: {
    summary: boolean;
    supplier: boolean;
    purchaseOrder: boolean;
  };

  // View Rekap
  viewRekapParent: boolean;
  viewRekap: {
    stokCafe: boolean;
    stokGudang: boolean;
    penjualan: boolean;
  };

  // View Employees
  viewEmployeesParent: boolean;
  viewEmployees: {
    employeeSlots: boolean;
    employeeAccess: boolean;
  };
}

export default function EmployeeAccess() {
  const [roles, setRoles] = useState<RoleEmployee[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Kontrol side panel form (Create/Edit)
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // false = create, true = edit
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);

  // Role Name
  const [roleName, setRoleName] = useState("");

  // App Permissions
  const [appPermissions, setAppPermissions] = useState<AppPermissions>({
    cashier: false,
    menus: false,
    layoutCafe: false,
    riwayat: false,
    reservasi: false,
  });

  // Backoffice Permissions
  const [backofficePermissions, setBackofficePermissions] = useState<BackofficePermissions>({
    viewDashboard: false,
    viewReportsParent: false,
    viewReports: { sales: false, transactions: false },
    viewMenuParent: false,
    viewMenu: { daftarMenu: false, kategoriMenu: false },
    viewLibraryParent: false,
    viewLibrary: { bundles: false, taxes: false, gratuity: false, discount: false },
    viewModifierParent: false,
    viewModifier: { modifier: false, category: false },
    viewIngredientsParent: false,
    viewIngredients: { ingredientsLibrary: false, ingredientsCategory: false, recipes: false },
    viewInventoryParent: false,
    viewInventory: { summary: false, supplier: false, purchaseOrder: false },
    viewRekapParent: false,
    viewRekap: { stokCafe: false, stokGudang: false, penjualan: false },
    viewEmployeesParent: false,
    viewEmployees: { employeeSlots: false, employeeAccess: false },
  });

  // Kontrol side panel privileges (read-only)
  const [showPrivileges, setShowPrivileges] = useState(false);
  const [privilegesRole, setPrivilegesRole] = useState<RoleEmployee | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  // Ambil data roles
  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/employeeRoles");
      if (!res.ok) {
        throw new Error("Failed to fetch roles");
      }
      const data = await res.json();
      setRoles(data);
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to fetch roles");
    }
  };

  // ===================== CREATE =====================
  const openCreateForm = () => {
    setShowForm(true);
    setIsEditMode(false);
    setEditingRoleId(null);

    // Reset form
    setRoleName("");
    setAppPermissions({
      cashier: false,
      menus: false,
      layoutCafe: false,
      riwayat: false,
      reservasi: false,
    });
    setBackofficePermissions({
      viewDashboard: false,
      viewReportsParent: false,
      viewReports: { sales: false, transactions: false },
      viewMenuParent: false,
      viewMenu: { daftarMenu: false, kategoriMenu: false },
      viewLibraryParent: false,
      viewLibrary: { bundles: false, taxes: false, gratuity: false, discount: false },
      viewModifierParent: false,
      viewModifier: { modifier: false, category: false },
      viewIngredientsParent: false,
      viewIngredients: { ingredientsLibrary: false, ingredientsCategory: false, recipes: false },
      viewInventoryParent: false,
      viewInventory: { summary: false, supplier: false, purchaseOrder: false },
      viewRekapParent: false,
      viewRekap: { stokCafe: false, stokGudang: false, penjualan: false },
      viewEmployeesParent: false,
      viewEmployees: { employeeSlots: false, employeeAccess: false },
    });
  };

  // ===================== EDIT =====================
  const openEditForm = (role: RoleEmployee) => {
    setShowForm(true);
    setIsEditMode(true);
    setEditingRoleId(role.id);

    setRoleName(role.name);
    const permissions = role.permissions || [];

    // Set appPermissions berdasarkan permissions array
    setAppPermissions({
      cashier: permissions.includes("app.cashier"),
      menus: permissions.includes("app.menus"),
      layoutCafe: permissions.includes("app.layoutCafe"),
      riwayat: permissions.includes("app.riwayat"),
      reservasi: permissions.includes("app.reservasi"),
    });

    // Set backofficePermissions berdasarkan permissions array
    setBackofficePermissions({
      viewDashboard: permissions.includes("backoffice.viewDashboard"),
      viewReportsParent: false, // Parent hanya untuk UI, tidak disimpan
      viewReports: {
        sales: permissions.includes("backoffice.viewReports.sales"),
        transactions: permissions.includes("backoffice.viewReports.transactions"),
      },
      viewMenuParent: false,
      viewMenu: {
        daftarMenu: permissions.includes("backoffice.viewMenu.daftarMenu"),
        kategoriMenu: permissions.includes("backoffice.viewMenu.kategoriMenu"),
      },
      viewLibraryParent: false,
      viewLibrary: {
        bundles: permissions.includes("backoffice.viewLibrary.bundles"),
        taxes: permissions.includes("backoffice.viewLibrary.taxes"),
        gratuity: permissions.includes("backoffice.viewLibrary.gratuity"),
        discount: permissions.includes("backoffice.viewLibrary.discount"),
      },
      viewModifierParent: false,
      viewModifier: {
        modifier: permissions.includes("backoffice.viewModifier.modifier"),
        category: permissions.includes("backoffice.viewModifier.category"),
      },
      viewIngredientsParent: false,
      viewIngredients: {
        ingredientsLibrary: permissions.includes("backoffice.viewIngredients.ingredientsLibrary"),
        ingredientsCategory: permissions.includes("backoffice.viewIngredients.ingredientsCategory"),
        recipes: permissions.includes("backoffice.viewIngredients.recipes"),
      },
      viewInventoryParent: false,
      viewInventory: {
        summary: permissions.includes("backoffice.viewInventory.summary"),
        supplier: permissions.includes("backoffice.viewInventory.supplier"),
        purchaseOrder: permissions.includes("backoffice.viewInventory.purchaseOrder"),
      },
      viewRekapParent: false,
      viewRekap: {
        stokCafe: permissions.includes("backoffice.viewRekap.stokCafe"),
        stokGudang: permissions.includes("backoffice.viewRekap.stokGudang"),
        penjualan: permissions.includes("backoffice.viewRekap.penjualan"),
      },
      viewEmployeesParent: false,
      viewEmployees: {
        employeeSlots: permissions.includes("backoffice.viewEmployees.employeeSlots"),
        employeeAccess: permissions.includes("backoffice.viewEmployees.employeeAccess"),
      },
    });
  };

  // ===================== PRIVILEGES (READ-ONLY) =====================
  const openPrivileges = (role: RoleEmployee) => {
    setPrivilegesRole(role);
    setShowPrivileges(true);
  };
  const closePrivileges = () => {
    setPrivilegesRole(null);
    setShowPrivileges(false);
  };

  // ===================== SUBMIT (CREATE/EDIT) =====================
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      // Kumpulkan permission keys yang dipilih
      const selectedPermissions: string[] = [];

      // App Permissions
      if (appPermissions.cashier) selectedPermissions.push("app.cashier");
      if (appPermissions.menus) selectedPermissions.push("app.menus");
      if (appPermissions.layoutCafe) selectedPermissions.push("app.layoutCafe");
      if (appPermissions.riwayat) selectedPermissions.push("app.riwayat");
      if (appPermissions.reservasi) selectedPermissions.push("app.reservasi");

      // Backoffice Permissions
      if (backofficePermissions.viewDashboard) selectedPermissions.push("backoffice.viewDashboard");
      if (backofficePermissions.viewReports.sales) selectedPermissions.push("backoffice.viewReports.sales");
      if (backofficePermissions.viewReports.transactions) selectedPermissions.push("backoffice.viewReports.transactions");
      if (backofficePermissions.viewMenu.daftarMenu) selectedPermissions.push("backoffice.viewMenu.daftarMenu");
      if (backofficePermissions.viewMenu.kategoriMenu) selectedPermissions.push("backoffice.viewMenu.kategoriMenu");
      if (backofficePermissions.viewLibrary.bundles) selectedPermissions.push("backoffice.viewLibrary.bundles");
      if (backofficePermissions.viewLibrary.taxes) selectedPermissions.push("backoffice.viewLibrary.taxes");
      if (backofficePermissions.viewLibrary.gratuity) selectedPermissions.push("backoffice.viewLibrary.gratuity");
      if (backofficePermissions.viewLibrary.discount) selectedPermissions.push("backoffice.viewLibrary.discount");
      if (backofficePermissions.viewModifier.modifier) selectedPermissions.push("backoffice.viewModifier.modifier");
      if (backofficePermissions.viewModifier.category) selectedPermissions.push("backoffice.viewModifier.category");
      if (backofficePermissions.viewIngredients.ingredientsLibrary) selectedPermissions.push("backoffice.viewIngredients.ingredientsLibrary");
      if (backofficePermissions.viewIngredients.ingredientsCategory) selectedPermissions.push("backoffice.viewIngredients.ingredientsCategory");
      if (backofficePermissions.viewIngredients.recipes) selectedPermissions.push("backoffice.viewIngredients.recipes");
      if (backofficePermissions.viewInventory.summary) selectedPermissions.push("backoffice.viewInventory.summary");
      if (backofficePermissions.viewInventory.supplier) selectedPermissions.push("backoffice.viewInventory.supplier");
      if (backofficePermissions.viewInventory.purchaseOrder) selectedPermissions.push("backoffice.viewInventory.purchaseOrder");
      if (backofficePermissions.viewRekap.stokCafe) selectedPermissions.push("backoffice.viewRekap.stokCafe");
      if (backofficePermissions.viewRekap.stokGudang) selectedPermissions.push("backoffice.viewRekap.stokGudang");
      if (backofficePermissions.viewRekap.penjualan) selectedPermissions.push("backoffice.viewRekap.penjualan");
      if (backofficePermissions.viewEmployees.employeeSlots) selectedPermissions.push("backoffice.viewEmployees.employeeSlots");
      if (backofficePermissions.viewEmployees.employeeAccess) selectedPermissions.push("backoffice.viewEmployees.employeeAccess");

      // Buat payload
      const payload = {
        name: roleName,
        permissions: selectedPermissions,
      };

      if (isEditMode && editingRoleId) {
        (payload as any).id = editingRoleId;
      }

      const method = isEditMode ? "PUT" : "POST";
      const url = "/api/employeeRoles";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit role");
      }

      toast.success(isEditMode ? "Role updated successfully!" : "Role created successfully!");
      await fetchRoles();
      setShowForm(false);
    } catch (error: any) {
      console.error("Error submitting role:", error);
      toast.error(error.message || "Error submitting role");
    }
  };

  // ===================== TOGGLE PARENT CHECKBOX =====================
  const toggleReportsParent = (checked: boolean) => {
    setBackofficePermissions((prev) => ({
      ...prev,
      viewReportsParent: checked,
      viewReports: {
        sales: checked,
        transactions: checked,
      },
    }));
  };

  const toggleMenuParent = (checked: boolean) => {
    setBackofficePermissions((prev) => ({
      ...prev,
      viewMenuParent: checked,
      viewMenu: {
        daftarMenu: checked,
        kategoriMenu: checked,
      },
    }));
  };

  const toggleLibraryParent = (checked: boolean) => {
    setBackofficePermissions((prev) => ({
      ...prev,
      viewLibraryParent: checked,
      viewLibrary: {
        bundles: checked,
        taxes: checked,
        gratuity: checked,
        discount: checked,
      },
    }));
  };

  const toggleModifierParent = (checked: boolean) => {
    setBackofficePermissions((prev) => ({
      ...prev,
      viewModifierParent: checked,
      viewModifier: { modifier: checked, category: checked },
    }));
  };

  const toggleIngredientsParent = (checked: boolean) => {
    setBackofficePermissions((prev) => ({
      ...prev,
      viewIngredientsParent: checked,
      viewIngredients: {
        ingredientsLibrary: checked,
        ingredientsCategory: checked,
        recipes: checked,
      },
    }));
  };

  const toggleInventoryParent = (checked: boolean) => {
    setBackofficePermissions((prev) => ({
      ...prev,
      viewInventoryParent: checked,
      viewInventory: {
        summary: checked,
        supplier: checked,
        purchaseOrder: checked,
      },
    }));
  };

  const toggleRekapParent = (checked: boolean) => {
    setBackofficePermissions((prev) => ({
      ...prev,
      viewRekapParent: checked,
      viewRekap: {
        stokCafe: checked,
        stokGudang: checked,
        penjualan: checked,
      },
    }));
  };

  const toggleEmployeesParent = (checked: boolean) => {
    setBackofficePermissions((prev) => ({
      ...prev,
      viewEmployeesParent: checked,
      viewEmployees: {
        employeeSlots: checked,
        employeeAccess: checked,
      },
    }));
  };

  return (
    <div className="flex min-h-screen bg-[#FFFAF0] text-black">
      {/* Toastify container */}
      <ToastContainer />

      <Sidebar onToggle={setSidebarOpen} isOpen={sidebarOpen} />

      <div className={`flex-1 p-4 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Employee Access</h1>
          <button onClick={openCreateForm} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
            Create Employee Role
          </button>
        </div>

        {/* Tabel: Role Name, Employees Assigned, Access */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Role Name</th>
                <th className="border p-2">Employees Assigned</th>
                <th className="border p-2">Access</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td className="border p-2">{role.name}</td>
                  <td className="border p-2">
                    {role.employees && role.employees.length > 0 ? (
                      <ul className="list-disc list-inside">
                        {role.employees.map((emp) => (
                          <li key={emp.id}>
                            {emp.firstName} {emp.lastName}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-500">No employees</span>
                    )}
                  </td>
                  <td className="border p-2">
                    {/* Tombol "Privileges" */}
                    <button onClick={() => openPrivileges(role)} className="bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 mr-2">
                      Privileges
                    </button>

                    {/* Tombol "Edit Privileges" */}
                    <button onClick={() => openEditForm(role)} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200">
                      Edit Privileges
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Panel Form (Create/Edit Role) */}
      {showForm && (
        <div className="fixed top-0 right-0 w-full md:w-1/4 h-screen bg-white shadow-xl p-4 z-50 overflow-auto">
          <h2 className="text-xl font-bold mb-4">{isEditMode ? "Edit Role" : "Create Employee Role"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Name */}
            <div>
              <label className="block mb-1 font-medium">Role Name</label>
              <input type="text" value={roleName} onChange={(e) => setRoleName(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" required />
            </div>

            {/* App Permissions */}
            <fieldset className="border rounded p-3">
              <legend className="font-semibold">App Permissions</legend>
              <div className="flex flex-col mt-2 space-y-2">
                <label>
                  <input type="checkbox" checked={appPermissions.cashier} onChange={(e) => setAppPermissions({ ...appPermissions, cashier: e.target.checked })} /> Cashier
                </label>
                <label>
                  <input type="checkbox" checked={appPermissions.menus} onChange={(e) => setAppPermissions({ ...appPermissions, menus: e.target.checked })} /> Menu
                </label>
                <label>
                  <input type="checkbox" checked={appPermissions.layoutCafe} onChange={(e) => setAppPermissions({ ...appPermissions, layoutCafe: e.target.checked })} /> Layout Cafe
                </label>
                <label>
                  <input type="checkbox" checked={appPermissions.riwayat} onChange={(e) => setAppPermissions({ ...appPermissions, riwayat: e.target.checked })} /> Riwayat
                </label>
                <label>
                  <input type="checkbox" checked={appPermissions.reservasi} onChange={(e) => setAppPermissions({ ...appPermissions, reservasi: e.target.checked })} /> Reservasi
                </label>
              </div>
            </fieldset>

            {/* Backoffice Permissions */}
            <fieldset className="border rounded p-3">
              <legend className="font-semibold">Backoffice Permissions</legend>

              {/* View Dashboard */}
              <div className="mt-2">
                <label>
                  <input
                    type="checkbox"
                    checked={backofficePermissions.viewDashboard}
                    onChange={(e) =>
                      setBackofficePermissions({
                        ...backofficePermissions,
                        viewDashboard: e.target.checked,
                      })
                    }
                  />{" "}
                  View Dashboard
                </label>
              </div>

              {/* View Reports */}
              <div className="mt-2">
                <label>
                  <input type="checkbox" checked={backofficePermissions.viewReportsParent} onChange={(e) => toggleReportsParent(e.target.checked)} /> <span className="font-medium">View Reports</span>
                </label>
              </div>
              <ul className="ml-6 list-disc space-y-1 mt-1">
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewReports.sales}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewReports: {
                            ...prev.viewReports,
                            sales: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Sales
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewReports.transactions}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewReports: {
                            ...prev.viewReports,
                            transactions: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Transactions
                  </label>
                </li>
              </ul>

              {/* View Menu */}
              <div className="mt-2">
                <label>
                  <input type="checkbox" checked={backofficePermissions.viewMenuParent} onChange={(e) => toggleMenuParent(e.target.checked)} /> <span className="font-medium">View Menu</span>
                </label>
              </div>
              <ul className="ml-6 list-disc space-y-1 mt-1">
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewMenu.daftarMenu}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewMenu: {
                            ...prev.viewMenu,
                            daftarMenu: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Daftar Menu
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewMenu.kategoriMenu}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewMenu: {
                            ...prev.viewMenu,
                            kategoriMenu: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Kategori Menu
                  </label>
                </li>
              </ul>

              {/* View Library */}
              <div className="mt-2">
                <label>
                  <input type="checkbox" checked={backofficePermissions.viewLibraryParent} onChange={(e) => toggleLibraryParent(e.target.checked)} /> <span className="font-medium">View Library</span>
                </label>
              </div>
              <ul className="ml-6 list-disc space-y-1 mt-1">
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewLibrary.bundles}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewLibrary: {
                            ...prev.viewLibrary,
                            bundles: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Bundles
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewLibrary.taxes}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewLibrary: {
                            ...prev.viewLibrary,
                            taxes: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Taxes
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewLibrary.gratuity}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewLibrary: {
                            ...prev.viewLibrary,
                            gratuity: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Gratuity
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewLibrary.discount}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewLibrary: {
                            ...prev.viewLibrary,
                            discount: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Discount
                  </label>
                </li>
              </ul>

              {/* View Modifier */}
              <div className="mt-2">
                <label>
                  <input type="checkbox" checked={backofficePermissions.viewModifierParent} onChange={(e) => toggleModifierParent(e.target.checked)} /> <span className="font-medium">View Modifier</span>
                </label>
              </div>
              <ul className="ml-6 list-disc space-y-1 mt-1">
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewModifier.modifier}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewModifier: {
                            ...prev.viewModifier,
                            modifier: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Modifier
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewModifier.category}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewModifier: {
                            ...prev.viewModifier,
                            category: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Category
                  </label>
                </li>
              </ul>

              {/* View Ingredients */}
              <div className="mt-2">
                <label>
                  <input type="checkbox" checked={backofficePermissions.viewIngredientsParent} onChange={(e) => toggleIngredientsParent(e.target.checked)} /> <span className="font-medium">View Ingredients</span>
                </label>
              </div>
              <ul className="ml-6 list-disc space-y-1 mt-1">
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewIngredients.ingredientsLibrary}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewIngredients: {
                            ...prev.viewIngredients,
                            ingredientsLibrary: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Ingredients Library
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewIngredients.ingredientsCategory}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewIngredients: {
                            ...prev.viewIngredients,
                            ingredientsCategory: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Ingredients Category
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewIngredients.recipes}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewIngredients: {
                            ...prev.viewIngredients,
                            recipes: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Recipes
                  </label>
                </li>
              </ul>

              {/* View Inventory */}
              <div className="mt-2">
                <label>
                  <input type="checkbox" checked={backofficePermissions.viewInventoryParent} onChange={(e) => toggleInventoryParent(e.target.checked)} /> <span className="font-medium">View Inventory</span>
                </label>
              </div>
              <ul className="ml-6 list-disc space-y-1 mt-1">
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewInventory.summary}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewInventory: {
                            ...prev.viewInventory,
                            summary: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Summary
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewInventory.supplier}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewInventory: {
                            ...prev.viewInventory,
                            supplier: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Supplier
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewInventory.purchaseOrder}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewInventory: {
                            ...prev.viewInventory,
                            purchaseOrder: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Purchase Order
                  </label>
                </li>
              </ul>

              {/* View Rekap */}
              <div className="mt-2">
                <label>
                  <input type="checkbox" checked={backofficePermissions.viewRekapParent} onChange={(e) => toggleRekapParent(e.target.checked)} /> <span className="font-medium">View Rekap</span>
                </label>
              </div>
              <ul className="ml-6 list-disc space-y-1 mt-1">
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewRekap.stokCafe}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewRekap: {
                            ...prev.viewRekap,
                            stokCafe: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Rekap Stok Cafe
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewRekap.stokGudang}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewRekap: {
                            ...prev.viewRekap,
                            stokGudang: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Rekap Stok Gudang
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewRekap.penjualan}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewRekap: {
                            ...prev.viewRekap,
                            penjualan: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Rekap Penjualan
                  </label>
                </li>
              </ul>

              {/* View Employees */}
              <div className="mt-2">
                <label>
                  <input type="checkbox" checked={backofficePermissions.viewEmployeesParent} onChange={(e) => toggleEmployeesParent(e.target.checked)} /> <span className="font-medium">View Employees</span>
                </label>
              </div>
              <ul className="ml-6 list-disc space-y-1 mt-1">
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewEmployees.employeeSlots}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewEmployees: {
                            ...prev.viewEmployees,
                            employeeSlots: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Employee Slots
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewEmployees.employeeAccess}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewEmployees: {
                            ...prev.viewEmployees,
                            employeeAccess: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Employee Access
                  </label>
                </li>
              </ul>
            </fieldset>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setIsEditMode(false);
                  setEditingRoleId(null);
                }}
                className="px-4 py-2 rounded-md border"
              >
                Cancel
              </button>
              <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
                {isEditMode ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Side Panel Privileges (READ-ONLY) */}
      {showPrivileges && privilegesRole && (
        <div className="fixed top-0 right-0 w-full md:w-1/4 h-screen bg-white shadow-xl p-4 z-50 overflow-auto">
          <h2 className="text-xl font-bold mb-4">Privileges for: {privilegesRole.name}</h2>

          {/* App Permissions */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2">App Permissions</h3>
            <ul className="list-disc list-inside ml-4">
              {privilegesRole.permissions.includes("app.cashier") && <li>Cashier</li>}
              {privilegesRole.permissions.includes("app.menus") && <li>Menu</li>}
              {privilegesRole.permissions.includes("app.layoutCafe") && <li>Layout Cafe</li>}
              {privilegesRole.permissions.includes("app.riwayat") && <li>Riwayat</li>}
              {privilegesRole.permissions.includes("app.reservasi") && <li>Reservasi</li>}
            </ul>
          </div>

          {/* Backoffice Permissions */}
          <div>
            <h3 className="font-semibold mb-2">Backoffice Permissions</h3>
            <div className="space-y-2 text-sm ml-4">
              {privilegesRole.permissions.includes("backoffice.viewDashboard") && <div>- View Dashboard</div>}
              {(privilegesRole.permissions.includes("backoffice.viewReports.sales") || privilegesRole.permissions.includes("backoffice.viewReports.transactions")) && (
                <div>
                  - View Reports:
                  <ul className="list-disc list-inside ml-4">
                    {privilegesRole.permissions.includes("backoffice.viewReports.sales") && <li>Sales</li>}
                    {privilegesRole.permissions.includes("backoffice.viewReports.transactions") && <li>Transactions</li>}
                  </ul>
                </div>
              )}
              {(privilegesRole.permissions.includes("backoffice.viewMenu.daftarMenu") || privilegesRole.permissions.includes("backoffice.viewMenu.kategoriMenu")) && (
                <div>
                  - View Menu:
                  <ul className="list-disc list-inside ml-4">
                    {privilegesRole.permissions.includes("backoffice.viewMenu.daftarMenu") && <li>Daftar Menu</li>}
                    {privilegesRole.permissions.includes("backoffice.viewMenu.kategoriMenu") && <li>Kategori Menu</li>}
                  </ul>
                </div>
              )}
              {(privilegesRole.permissions.includes("backoffice.viewLibrary.bundles") ||
                privilegesRole.permissions.includes("backoffice.viewLibrary.taxes") ||
                privilegesRole.permissions.includes("backoffice.viewLibrary.gratuity") ||
                privilegesRole.permissions.includes("backoffice.viewLibrary.discount")) && (
                <div>
                  - View Library:
                  <ul className="list-disc list-inside ml-4">
                    {privilegesRole.permissions.includes("backoffice.viewLibrary.bundles") && <li>Bundles</li>}
                    {privilegesRole.permissions.includes("backoffice.viewLibrary.taxes") && <li>Taxes</li>}
                    {privilegesRole.permissions.includes("backoffice.viewLibrary.gratuity") && <li>Gratuity</li>}
                    {privilegesRole.permissions.includes("backoffice.viewLibrary.discount") && <li>Discount</li>}
                  </ul>
                </div>
              )}
              {(privilegesRole.permissions.includes("backoffice.viewModifier.modifier") || privilegesRole.permissions.includes("backoffice.viewModifier.category")) && (
                <div>
                  - View Modifier:
                  <ul className="list-disc list-inside ml-4">
                    {privilegesRole.permissions.includes("backoffice.viewModifier.modifier") && <li>Modifier</li>}
                    {privilegesRole.permissions.includes("backoffice.viewModifier.category") && <li>Category</li>}
                  </ul>
                </div>
              )}
              {(privilegesRole.permissions.includes("backoffice.viewIngredients.ingredientsLibrary") ||
                privilegesRole.permissions.includes("backoffice.viewIngredients.ingredientsCategory") ||
                privilegesRole.permissions.includes("backoffice.viewIngredients.recipes")) && (
                <div>
                  - View Ingredients:
                  <ul className="list-disc list-inside ml-4">
                    {privilegesRole.permissions.includes("backoffice.viewIngredients.ingredientsLibrary") && <li>Ingredients Library</li>}
                    {privilegesRole.permissions.includes("backoffice.viewIngredients.ingredientsCategory") && <li>Ingredients Category</li>}
                    {privilegesRole.permissions.includes("backoffice.viewIngredients.recipes") && <li>Recipes</li>}
                  </ul>
                </div>
              )}
              {(privilegesRole.permissions.includes("backoffice.viewInventory.summary") ||
                privilegesRole.permissions.includes("backoffice.viewInventory.supplier") ||
                privilegesRole.permissions.includes("backoffice.viewInventory.purchaseOrder")) && (
                <div>
                  - View Inventory:
                  <ul className="list-disc list-inside ml-4">
                    {privilegesRole.permissions.includes("backoffice.viewInventory.summary") && <li>Summary</li>}
                    {privilegesRole.permissions.includes("backoffice.viewInventory.supplier") && <li>Supplier</li>}
                    {privilegesRole.permissions.includes("backoffice.viewInventory.purchaseOrder") && <li>Purchase Order</li>}
                  </ul>
                </div>
              )}
              {(privilegesRole.permissions.includes("backoffice.viewRekap.stokCafe") || privilegesRole.permissions.includes("backoffice.viewRekap.stokGudang") || privilegesRole.permissions.includes("backoffice.viewRekap.penjualan")) && (
                <div>
                  - View Rekap:
                  <ul className="list-disc list-inside ml-4">
                    {privilegesRole.permissions.includes("backoffice.viewRekap.stokCafe") && <li>Rekap Stok Cafe</li>}
                    {privilegesRole.permissions.includes("backoffice.viewRekap.stokGudang") && <li>Rekap Stok Gudang</li>}
                    {privilegesRole.permissions.includes("backoffice.viewRekap.penjualan") && <li>Rekap Penjualan</li>}
                  </ul>
                </div>
              )}
              {(privilegesRole.permissions.includes("backoffice.viewEmployees.employeeSlots") || privilegesRole.permissions.includes("backoffice.viewEmployees.employeeAccess")) && (
                <div>
                  - View Employees:
                  <ul className="list-disc list-inside ml-4">
                    {privilegesRole.permissions.includes("backoffice.viewEmployees.employeeSlots") && <li>Employee Slots</li>}
                    {privilegesRole.permissions.includes("backoffice.viewEmployees.employeeAccess") && <li>Employee Access</li>}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button onClick={() => setShowPrivileges(false)} className="px-4 py-2 border rounded hover:bg-gray-100">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
