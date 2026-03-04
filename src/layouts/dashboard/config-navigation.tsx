import { useMemo } from "react";
// routes
import { paths } from "src/routes/paths";
// locales
import { useLocales } from "src/locales";
// components
import Label from "src/components/label";
import Iconify from "src/components/iconify";
import SvgColor from "src/components/svg-color";

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`/assets/icons/navbar/${name}.svg`} sx={{ width: 1, height: 1 }} />
);

const ICONS = {
  job: icon("ic_job"),
  blog: icon("ic_blog"),
  chat: icon("ic_chat"),
  mail: icon("ic_mail"),
  user: icon("ic_user"),
  file: icon("ic_file"),
  lock: icon("ic_lock"),
  tour: icon("ic_tour"),
  order: icon("ic_order"),
  label: icon("ic_label"),
  blank: icon("ic_blank"),
  kanban: icon("ic_kanban"),
  folder: icon("ic_folder"),
  banking: icon("ic_banking"),
  booking: icon("ic_booking"),
  invoice: icon("ic_invoice"),
  product: icon("ic_product"),
  calendar: icon("ic_calendar"),
  disabled: icon("ic_disabled"),
  external: icon("ic_external"),
  menuItem: icon("ic_menu_item"),
  ecommerce: icon("ic_ecommerce"),
  analytics: icon("ic_analytics"),
  dashboard: icon("ic_dashboard"),
};

// ✅ Utility function to get current role
const getUserRole = (): "admin" | "sub-admin" | "subadmin" | "user" => {
  try {
    const userData = localStorage.getItem("authUser");
    if (userData) {
      const parsed = JSON.parse(userData);
      return parsed.role || "user";
    }
    return "user";
  } catch {
    return "user";
  }
};

// ----------------------------------------------------------------------

export function useNavData() {
  const { t } = useLocales();

  const getAuthUser = () => {
    try {
      const userData = localStorage.getItem("authUser");
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  };

  const authUser = getAuthUser();
  const role = authUser?.role || "user";
  const isImpersonated = authUser?.impersonated || false;
  // ✅ Admin/Sub-Admin helper (handles all role variations)
  const isAdminRole = role === "admin" || role === "sub-admin" || role === "subadmin";

  const getUserLicence = (): string => authUser?.licence || "";

  // ✅ Get connected Broker Name
  const getBrokerName = (): string => {
    try {
      const userData = localStorage.getItem("authUser");
      if (userData) {
        const parsed = JSON.parse(userData);
        // Try to get from 'broker' or 'vendor' field, fallback to 'Broker'
        return parsed.broker || parsed.vendor || "Broker Info";
      }
      return "Broker Info";
    } catch {
      return "Broker Info";
    }
  };

  // ✅ Check if broker is connected
  const isBrokerConnected = (): boolean => {
    try {
      const userData = localStorage.getItem("authUser");
      if (userData) {
        const parsed = JSON.parse(userData);
        return !!(parsed.client_key && parsed.client_key.length > 0);
      }
      return false;
    } catch {
      return false;
    }
  };

  const licence = getUserLicence();
  const brokerName = getBrokerName();
  const brokerConnected = isBrokerConnected();

  const data = useMemo(
    () => [
      {
        subheader: t("overview"),
        items: [
          {
            title: t("Dashboard"),
            path: paths.dashboard.root,
            icon: <Iconify icon="solar:widget-5-bold-duotone" width={24} />,
            show: true,
          },
          {
            title: t("Clients"),
            path: paths.dashboard.general.ecommerce,
            icon: <Iconify icon="solar:users-group-rounded-bold-duotone" width={24} />,
            show: role !== "user",
            children: [
              { title: "Clients", path: paths.dashboard.general.ecommerce },
              { title: t("Expired Clients"), path: paths.dashboard.user.list },
              { title: t("SignUp Clients"), path: paths.dashboard.permission },
              { title: "Star Clients", path: paths.dashboard.starClients },
            ],
          },
          {
            title: t("Sub Admin"),
            path: paths.dashboard.general.analytics,
            icon: <Iconify icon="solar:shield-user-bold-duotone" width={24} />,
            // ✅ Only Master Admin manages Sub-Admins
            show: role === "admin",
          },
          {
            title: t("Trade Details"),
            path: paths.dashboard.general.banking,
            icon: <Iconify icon="solar:bill-list-bold-duotone" width={24} />,
            show: true, // ✅ Enabled for All Users (Live + Demo + Admin)
          },
          {
            title: t("Script Management"),
            path: paths.dashboard.product.root,
            icon: <Iconify icon="solar:code-square-bold-duotone" width={24} />,
            show: role !== "user",
            children: [
              { title: t("All Services"), path: paths.dashboard.product.root },
              {
                title: t("Group Services"),
                path: paths.dashboard.product.groupService,
                // ✅ Restricted for Sub-Admins without permission
                show: role === "admin" || !!authUser?.all_permission || !!authUser?.group_service_permission
              },
              {
                title: t("Strategis"),
                path: paths.dashboard.product.new,
                // ✅ Restricted for Sub-Admins without permission
                show: role === "admin" || !!authUser?.all_permission || !!authUser?.strategy_permission
              },
            ].filter(child => child.show !== false),
          },
          {
            title: t("Open Position"),
            path: paths.dashboard.order.root,
            icon: <Iconify icon="solar:chart-2-bold-duotone" width={24} />,
            // ✅ Admin/Sub-Admin always see this. Demo users are hidden.
            show: isAdminRole || licence !== "Demo",
            children: [
              { title: t("Option Chain"), path: paths.dashboard.order.root },
              { title: t("Open Position"), path: paths.dashboard.user.account },
            ],
          },
          {
            title: t("Licence"),
            path: paths.dashboard.tour.root,
            icon: <Iconify icon="solar:key-minimalistic-square-bold-duotone" width={24} />,
            show: role !== "user",
            children: [
              {
                title: t("Transaction License"),
                path: paths.dashboard.tour.root,
                show: role === "admin" || !!authUser?.all_permission || !!authUser?.licence_permission
              },
              {
                title: t("Expired License"),
                path: paths.dashboard.invoice.root,
                show: role === "admin" || !!authUser?.all_permission || !!authUser?.licence_permission
              },
            ].filter(child => child.show !== false),
          },
          {
            title: t("More"),
            path: paths.dashboard.general.file,
            icon: <Iconify icon="solar:menu-dots-bold-duotone" width={24} />,
            show: role === 'admin', // ✅ Usually only for Master Admin
          },
          {
            title: t("Help Center"),
            path: paths.dashboard.helpCenter,
            icon: <Iconify icon="solar:help-bold-duotone" width={24} />,
            show: role === "user", // ✅ Only for Users
          },
          {
            title: t("Message Center"),
            path: paths.dashboard.messageCenter,
            icon: <Iconify icon="solar:mailbox-bold-duotone" width={24} />,
            show: role === "admin" || role === "sub-admin", // ✅ For Admin & Sub Admin
          },
          {
            title: t("Tickets"),
            path: paths.dashboard.tickets,
            icon: <Iconify icon="solar:ticket-bold-duotone" width={24} />,
            show: role === "admin" || role === "sub-admin", // ✅ For Admin & Sub Admin
          },
          {
            title: t("Connect Broker"),
            path: paths.dashboard.brokerConnect,
            icon: <Iconify icon="solar:link-circle-bold-duotone" width={24} />,

            show: isAdminRole
              ? !brokerConnected
              : (licence === "Live" && !brokerConnected),
          },
          {
            title: t("Broker Response"),
            path: paths.dashboard.brokerResponse,
            icon: <Iconify icon="solar:letter-opened-bold-duotone" width={24} />,

            show: !isAdminRole && role === "user",
          },
          {
            title: t("FAQ"),
            path: paths.dashboard.faq,
            icon: <Iconify icon="solar:question-circle-bold-duotone" width={24} />,
            show: true,
          },
          {
            title: t("Api Info"),
            path: paths.dashboard.apiInfo,
            icon: <Iconify icon="solar:info-circle-bold-duotone" width={24} />,
            show: true,
          },
        ],
      },
    ],
    [t, role, isAdminRole, brokerConnected, licence, authUser]
  );

  const filteredData = data.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (isImpersonated) {
        return item.title === t("Dashboard") || item.title === t("Api Info");
      }
      return item.show !== false;
    }),
  }));

  return filteredData;
}

