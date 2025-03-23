import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";

type UserType = "admin" | "user" | null;

interface AuthContextType {
  userType: UserType;
  login: (userType: UserType) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  userType: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userType, setUserType] = useState<UserType>(null);
  const [, setLocation] = useLocation();

  // Check for existing session on mount
  useEffect(() => {
    const storedUserType = localStorage.getItem("userType") as UserType;
    if (storedUserType) {
      setUserType(storedUserType);
    }
  }, []);

  const login = (type: UserType) => {
    setUserType(type);
    localStorage.setItem("userType", type || "");
  };

  const logout = () => {
    setUserType(null);
    localStorage.removeItem("userType");
    setLocation("/");
  };

  return (
    <AuthContext.Provider
      value={{
        userType,
        login,
        logout,
        isAuthenticated: !!userType,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
