import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUsers,
  FiBriefcase,
  FiActivity,
  FiServer,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiArrowRight,
  FiPlus,
  FiSettings,
  FiDatabase,
  FiPieChart,
  FiTrendingUp,
  FiGlobe,
} from "react-icons/fi";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import api from "../../api";
import Loader from "../../components/Loader";

const AdminMasterDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [tenantStats, setTenantStats] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  const COLORS = {
    primary: "#3B82F6",
    secondary: "#10B981",
    accent: "#8B5CF6",
    warning: "#F59E0B",
    danger: "#EF4444",
    success: "#10B981",
    text: "#1E293B",
    textLight: "#64748B",
    border: "#E2E8F0",
    background: "#F8FAFC",
    cardBg: "#FFFFFF",
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch all required data in parallel
        const [statsRes, tenantsRes, healthRes, activityRes] =
          await Promise.all([
            api.get("/admin/stats"),
            api.get("/admin/tenant-stats"),
            api.get("/admin/system-health"),
            api.get("/admin/recent-activity"),
          ]);

        setStats(statsRes.data);
        setTenantStats(tenantsRes.data);
        setSystemHealth(healthRes.data);
        setRecentActivity(activityRes.data);
      } catch (err) {
        console.error("Error fetching dashboard data");
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Loader />;
  if (error)
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center text-red-600">
            <FiAlertCircle className="mr-2" />
            {error}
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          System Overview
        </h1>
        <p className="text-slate-600">
          Monitor and manage your entire system from one place
        </p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Tenants</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">
                {stats?.totalTenants || 0}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <FiBriefcase className="text-xl" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600">
              +{stats?.newTenantsThisMonth || 0}
            </span>
            <span className="text-slate-500 ml-2">this month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Users</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">
                {stats?.totalUsers || 0}
              </h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <FiUsers className="text-xl" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600">
              +{stats?.newUsersThisMonth || 0}
            </span>
            <span className="text-slate-500 ml-2">this month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Reports</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">
                {stats?.totalReports || 0}
              </h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <FiActivity className="text-xl" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600">
              +{stats?.reportsThisMonth || 0}
            </span>
            <span className="text-slate-500 ml-2">this month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600">System Health</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">
                {systemHealth?.status || "Good"}
              </h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <FiServer className="text-xl" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600">
              {systemHealth?.uptime || "99.9%"}
            </span>
            <span className="text-slate-500 ml-2">uptime</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tenant Activity Chart */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                Tenant Activity
              </h3>
              <p className="text-sm text-slate-600">Last 30 days activity</p>
            </div>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <FiTrendingUp />
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tenantStats}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="date" stroke={COLORS.textLight} />
                <YAxis stroke={COLORS.textLight} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: COLORS.cardBg,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="active"
                  name="Active Users"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="reports"
                  name="Reports Generated"
                  stroke={COLORS.success}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Resources */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                System Resources
              </h3>
              <p className="text-sm text-slate-600">Current usage statistics</p>
            </div>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <FiDatabase />
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={systemHealth?.resources || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="name" stroke={COLORS.textLight} />
                <YAxis stroke={COLORS.textLight} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: COLORS.cardBg,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="usage"
                  name="Usage %"
                  fill={COLORS.primary}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Recent Activity
                </h3>
                <p className="text-sm text-slate-600">
                  System-wide activity log
                </p>
              </div>
              <button
                onClick={() => navigate("/adminmaster/logs")}
                className="text-blue-600 hover:text-blue-700 transition-colors text-sm flex items-center"
              >
                View all <FiArrowRight className="ml-1" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-200">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start">
                  <div
                    className={`p-2 rounded-lg mr-4 ${
                      activity.type === "error"
                        ? "bg-red-50 text-red-600"
                        : activity.type === "warning"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-green-50 text-green-600"
                    }`}
                  >
                    {activity.type === "error" ? (
                      <FiAlertCircle />
                    ) : activity.type === "warning" ? (
                      <FiClock />
                    ) : (
                      <FiCheckCircle />
                    )}
                  </div>
                  <div>
                    <p className="text-slate-800 font-medium">
                      {activity.message}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {activity.tenant} • {activity.timestamp}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate("/adminmaster/empresas/novo")}
              className="w-full flex items-center justify-between p-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center">
                <FiPlus className="mr-3" />
                <span>Add New Tenant</span>
              </div>
              <FiArrowRight />
            </button>

            <button
              onClick={() => navigate("/adminmaster/usuarios")}
              className="w-full flex items-center justify-between p-4 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center">
                <FiUsers className="mr-3" />
                <span>Manage Users</span>
              </div>
              <FiArrowRight />
            </button>

            <button
              onClick={() => navigate("/adminmaster/configuracoes")}
              className="w-full flex items-center justify-between p-4 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center">
                <FiSettings className="mr-3" />
                <span>System Settings</span>
              </div>
              <FiArrowRight />
            </button>

            <button
              onClick={() => navigate("/adminmaster/relatorios")}
              className="w-full flex items-center justify-between p-4 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center">
                <FiPieChart className="mr-3" />
                <span>Analytics</span>
              </div>
              <FiArrowRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMasterDashboard;
