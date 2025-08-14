import React from "react";
import { FiTrendingUp, FiTrendingDown } from "react-icons/fi";

const FinanceiroCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = "blue",
  isLoading = false,
}) => {
  const colorClasses = {
    blue: {
      bg: "from-blue-50 to-blue-100",
      border: "border-blue-200",
      text: "text-blue-800",
      icon: "text-blue-600",
      subtitle: "text-blue-600",
    },
    green: {
      bg: "from-green-50 to-green-100",
      border: "border-green-200",
      text: "text-green-800",
      icon: "text-green-600",
      subtitle: "text-green-600",
    },
    purple: {
      bg: "from-purple-50 to-purple-100",
      border: "border-purple-200",
      text: "text-purple-800",
      icon: "text-purple-600",
      subtitle: "text-purple-600",
    },
    orange: {
      bg: "from-orange-50 to-orange-100",
      border: "border-orange-200",
      text: "text-orange-800",
      icon: "text-orange-600",
      subtitle: "text-orange-600",
    },
    red: {
      bg: "from-red-50 to-red-100",
      border: "border-red-200",
      text: "text-red-800",
      icon: "text-red-600",
      subtitle: "text-red-600",
    },
  };

  const currentColor = colorClasses[color] || colorClasses.blue;

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-24"></div>
            <div className="h-8 bg-slate-200 rounded w-32"></div>
          </div>
          <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-gradient-to-br ${currentColor.bg} rounded-2xl shadow-sm border ${currentColor.border} p-6 transition-all duration-200 hover:shadow-md`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${currentColor.subtitle} mb-1`}>
            {title}
          </p>
          <p className={`text-3xl font-bold ${currentColor.text}`}>{value}</p>
          {trend && trendValue && (
            <div className="flex items-center mt-2">
              {trend === "up" ? (
                <FiTrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <FiTrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span
                className={`text-sm font-medium ${
                  trend === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-white/50`}>
          <Icon className={`w-8 h-8 ${currentColor.icon}`} />
        </div>
      </div>
    </div>
  );
};

export default FinanceiroCard;
