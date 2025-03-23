import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === "123") {
      login('admin');
      setError(false);
      setLocation("/admin");
      toast({
        title: "Acceso concedido",
        description: "Bienvenido al panel de administración",
      });
    } else {
      setError(true);
      toast({
        variant: "destructive",
        title: "Error de acceso",
        description: "Contraseña incorrecta. Intenta nuevamente.",
      });
    }
  };

  const goToUserSelection = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 p-8">
          <div className="flex items-center mb-6">
            <Lock className="text-primary h-6 w-6 mr-3" />
            <h2 className="text-2xl font-medium text-foreground">Acceso de Administrador</h2>
          </div>
          
          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <Label htmlFor="admin-password" className="text-muted-foreground">
                Contraseña
              </Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="Ingresa la contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`mt-2 ${error ? "border-destructive" : ""}`}
              />
              {error && (
                <p className="text-destructive mt-1 text-sm">
                  Contraseña incorrecta. Intenta nuevamente.
                </p>
              )}
            </div>
            
            <Button type="submit" className="w-full bg-primary text-primary-foreground">
              Ingresar
            </Button>
          </form>
          
          <Button 
            variant="ghost" 
            className="w-full mt-4 text-primary"
            onClick={goToUserSelection}
          >
            Volver a selección de usuario
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
