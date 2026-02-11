import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
// ✅ renamed Menu to MenuIcon to avoid object rendering issue
import {
    Menu as MenuIcon,
    FileText,
    Search,
    MapPin,
    BarChart2,
    MessageSquare,
} from "lucide-react";
import logo from "../assets/civic-logo.png";

function DashboardMenu() {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [language, setLanguage] = useState("EN");
    const [online, setOnline] = useState(navigator.onLine);

    const toggleMobileMenu = () => setMobileMenuOpen(!isMobileMenuOpen);
    const handleLanguageChange = (e) => setLanguage(e.target.value);

    // ✅ watch online/offline status
    useEffect(() => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    const sections = [
        {
            title: "Report Issue",
            icon: FileText,
            path: "/report",
            color: "bg-blue-100",
            iconColor: "text-blue-700",
            border: "border-blue-200",
        },
        {
            title: "Track Reports",
            icon: Search,
            path: "/track",
            color: "bg-green-100",
            iconColor: "text-green-700",
            border: "border-green-200",
        },
        {
            title: "Nearby Issues",
            icon: MapPin,
            path: "/nearby",
            color: "bg-yellow-100",
            iconColor: "text-yellow-700",
            border: "border-yellow-200",
        },
        {
            title: "Department Analysis",
            icon: BarChart2,
            path: "/department",
            color: "bg-purple-100",
            iconColor: "text-purple-700",
            border: "border-purple-200",
        },
        {
            title: "Feedback",
            icon: MessageSquare,
            path: "/feedback",
            color: "bg-pink-100",
            iconColor: "text-pink-700",
            border: "border-pink-200",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* ✅ Offline Banner */}
            {!online && (
                <div className="bg-red-600 text-white text-center text-sm py-2">
                    You are offline — you can still use the app and your data will sync later.
                </div>
            )}

            {/* Navbar */}
            <nav className="bg-white/95 backdrop-blur-md shadow-sm fixed top-0 w-full z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex-shrink-0 flex items-center">
                            <img src={logo} alt="Civic Logo" className="h-10 w-10 mr-2" />
                            <span className="font-bold text-xl text-gray-800 tracking-tight">
                                Civic Dashboard
                            </span>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex space-x-6 items-center">
                            {[
                                "Home",
                                "Report Issue",
                                "Track Reports",
                                "Nearby Issues",
                                "Analysis",
                                "Feedback",
                            ].map((item, idx) => (
                                <Link
                                    key={idx}
                                    to="/"
                                    className="text-gray-700 hover:text-blue-700 font-medium transition-colors"
                                >
                                    {item}
                                </Link>
                            ))}
                            <select
                                value={language}
                                onChange={handleLanguageChange}
                                className="ml-4 px-2 py-1 border rounded bg-white text-gray-700"
                            >
                                <option value="EN">EN</option>
                                <option value="HI">HI</option>
                                <option value="MR">MR</option>
                            </select>
                        </div>

                        {/* Mobile Hamburger */}
                        <div className="md:hidden flex items-center relative">
                            {/* ✅ Use MenuIcon instead of Menu */}
                            <MenuIcon
                                className="h-6 w-6 text-gray-700 cursor-pointer"
                                onClick={toggleMobileMenu}
                            />
                            {isMobileMenuOpen && (
                                <div className="absolute right-0 top-10 w-56 bg-white shadow-lg rounded-xl border border-gray-200 p-4 z-50">
                                    {sections.map((section, idx) => {
                                        const Icon = section.icon;
                                        return (
                                            <div
                                                key={idx}
                                                className="flex items-center space-x-3 p-3 mb-2 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                                                onClick={() => {
                                                    navigate(section.path);
                                                    setMobileMenuOpen(false);
                                                }}
                                            >
                                                <div className="p-2 bg-blue-100 rounded-full">
                                                    <Icon className="h-5 w-5 text-blue-700" />
                                                </div>
                                                <span className="text-gray-800 font-medium">{section.title}</span>
                                            </div>
                                        );
                                    })}
                                    <select
                                        value={language}
                                        onChange={handleLanguageChange}
                                        className="mt-2 w-full px-2 py-1 border rounded bg-white text-gray-700"
                                    >
                                        <option value="EN">EN</option>
                                        <option value="HI">HI</option>
                                        <option value="MR">MR</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="pt-24 flex flex-col items-center px-4">
                <div className="text-center mb-12 relative w-full max-w-4xl">
                    <div className="bg-gradient-to-b from-gray-100 via-gray-50 to-white rounded-xl shadow-inner p-8">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900">
                            Welcome to Civic Dashboard
                        </h1>
                        <p className="mt-4 text-gray-700 text-lg md:text-xl leading-relaxed">
                            Report issues, track them, explore nearby problems, analyze departments, and
                            provide feedback — all in one place.
                        </p>
                    </div>
                </div>

                {/* Sections Grid */}
                <div className="grid grid-cols-2 gap-6 w-full max-w-4xl">
                    {sections.map((section, index) => {
                        const Icon = section.icon;
                        return (
                            <div
                                key={index}
                                className={`flex flex-col items-center justify-center h-44 rounded-2xl text-gray-800 cursor-pointer transform transition-all duration-200 shadow-sm hover:shadow-md ${section.color} ${section.border} hover:bg-opacity-95 border`}
                                onClick={() => navigate(section.path)}
                            >
                                <div
                                    className={`p-4 rounded-full mb-3 bg-opacity-30 ${section.color}`}
                                >
                                    <Icon className={`h-10 w-10 ${section.iconColor}`} />
                                </div>
                                <span className="text-lg font-semibold text-center text-gray-800">
                                    {section.title}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <footer className="mt-12 text-gray-500 text-sm text-center">
                    &copy; {new Date().getFullYear()} Civic Dashboard. Official platform for public
                    service reporting and tracking.
                </footer>
            </div>
        </div>
    );
}

export default DashboardMenu;
