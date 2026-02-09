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
const getUserRole = (): "admin" | "subadmin" | "user" => {
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
  const role = getUserRole();
  const isBrokerConnected =
    localStorage.getItem("angel_jwt") !== null;
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
              { title: "Star Clients", path: paths.dashboard.blank },
            ],
          },
          {
            title: t("Sub Admin"),
            path: paths.dashboard.general.analytics,
            icon: <Iconify icon="solar:shield-user-bold-duotone" width={24} />,
            show: role === "admin" || role === "subadmin",
          },
          {
            title: t("Trade Details"),
            path: paths.dashboard.general.banking,
            icon: <Iconify icon="solar:bill-list-bold-duotone" width={24} />,
            show: role !== "user",
          },
          {
            title: t("Script Management"),
            path: paths.dashboard.product.root,
            icon: <Iconify icon="solar:code-square-bold-duotone" width={24} />,
            show: role !== "user",
            children: [
              { title: t("All Services"), path: paths.dashboard.product.root },
              { title: t("Group Services"), path: paths.dashboard.product.demo.details },
              { title: t("Strategis"), path: paths.dashboard.product.new },
            ],
          },
          {
            title: t("Open Position"),
            path: paths.dashboard.order.root,
            icon: <Iconify icon="solar:chart-2-bold-duotone" width={24} />,
            show: true,
            children: [
              { title: t("Option Chain"), path: paths.dashboard.order.root },
              { title: t("Open Position"), path: paths.dashboard.user.account },
            ],
          },
          {
            title: t("Licence"),
            path: paths.dashboard.tour.root,
            icon: <Iconify icon="solar:key-minimalistic-square-bold-duotone" width={24} />,
            show: role !== "user", // ✅ user ke liye nahi
            children: [
              { title: t("Transaction License"), path: paths.dashboard.tour.root },
              { title: t("Expired License"), path: paths.dashboard.invoice.root },
            ],
          },
          {
            title: t("More"),
            path: paths.dashboard.general.file,
            icon: <Iconify icon="solar:menu-dots-bold-duotone" width={24} />,
            show: role === "admin", // ✅ sirf admin ke liye
          },
          {
            title: t("Connect Broker"),
            path: paths.dashboard.brokerConnect,
            show: role === "user" && !isBrokerConnected,
          },

        ],
      },
    ],
    [t, role, isBrokerConnected]
  );

  // ✅ Filter items based on show condition
  const filteredData = data.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.show !== false),
  }));

  return filteredData;
}

