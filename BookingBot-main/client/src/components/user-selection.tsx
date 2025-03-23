import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Building, User, Users, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

// Datos de usuarios predefinidos
const USERS = [
  { id: 1, username: "Admin", isAdmin: true },
  { id: 2, username: "Luis Glez", isAdmin: false },
  { id: 3, username: "David Glez", isAdmin: false },
  { id: 4, username: "Luis Glez Llobet", isAdmin: false },
  { id: 5, username: "Martina", isAdmin: false },
  { id: 6, username: "Juan", isAdmin: false },
  { id: 7, username: "Mº Teresa", isAdmin: false }
];

export default function UserSelection() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [expandUsers, setExpandUsers] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleAdminSelect = () => {
    setLocation('/admin/login');
  };

  const handleUserSelect = (userId: number, username: string) => {
    // Establecer el usuario seleccionado en el contexto
    login('user');
    // Almacenar el ID y nombre del usuario en el localStorage
    localStorage.setItem('userId', userId.toString());
    localStorage.setItem('username', username);
    // Redireccionar a la página de usuario
    setLocation('/user');
  };

  // Filtrar usuarios que no son administradores
  const regularUsers = USERS.filter(user => !user.isAdmin);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background p-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-semibold text-foreground mb-2">Gestión de Reservas</h1>
        <p className="text-xl text-muted-foreground">Selecciona tu perfil para continuar</p>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-4xl w-full">
          {/* Admin Card */}
          <Card 
            className="shadow-md cursor-pointer hover:shadow-lg transition-shadow" 
            onClick={handleAdminSelect}
          >
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-4">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                  <Building className="h-8 w-8 text-white" />
                </div>
                <div className="text-center md:text-left">
                  <h2 className="text-2xl font-medium text-foreground">Admin</h2>
                  <p className="text-muted-foreground mt-1">
                    Gestión de reservas y administración
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Section */}
          <div className="space-y-4">
            <div 
              className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-accent"
              onClick={() => setExpandUsers(!expandUsers)}
            >
              <Users className="h-5 w-5" />
              <h3 className="text-xl font-medium">
                Usuarios ({regularUsers.length})
              </h3>
              <div className="ml-auto">
                <span className="text-2xl">
                  {expandUsers ? '−' : '+'}
                </span>
              </div>
            </div>

            {expandUsers && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {regularUsers.map(user => (
                  <Card 
                    key={user.id}
                    className="shadow-md cursor-pointer hover:shadow-lg transition-shadow border-secondary/40"
                    onClick={() => handleUserSelect(user.id, user.username)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-medium">{user.username}</h2>
                          <p className="text-sm text-muted-foreground">
                            Solicitud y gestión de mis reservas
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
