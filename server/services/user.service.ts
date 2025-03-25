import { User } from '../../shared/schema';
import { storage } from '../storage';

/**
 * Servicio para gestionar los usuarios y sus detalles
 */
export class UserService {
  /**
   * Mapa de correos electrónicos de usuarios hardcodeados (temporal)
   * En un sistema real, esto estaría en la base de datos
   */
  private static userEmails: Record<number, string> = {
    1: 'luisglez.pruebas@gmail.com', // Admin
    2: 'luisgonzalezterol@gmail.com', // Luis Glez
    3: 'dgonzalezllobet@gmail.com', // David Glez
    4: 'luisglezllobet@gmail.com', // Luis Glez Llobet
    5: 'martina.glez.yudego@gmail.com', // Martina
    6: 'jgterol@gmail.com', // Juan
    7: 'mtllobeti@gmail.com' // Mº Teresa
  };
  
  /**
   * Obtiene el email de un usuario dado su ID
   */
  static async getUserEmail(userId: number): Promise<string> {
    // Verificar primero en el mapa temporal
    if (this.userEmails[userId]) {
      return this.userEmails[userId];
    }
    
    // Si no se encuentra, intentar buscar en la base de datos
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`Usuario con ID ${userId} no encontrado`);
    }
    
    // Si el usuario existe pero no tiene email en el mapa, devolver email por defecto
    return this.userEmails[userId] || 'luisgonzalezterol@gmail.com';
  }
  
  /**
   * Obtiene el nombre de usuario y el email dado su ID
   */
  static async getUserInfo(userId: number): Promise<{ username: string, email: string }> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`Usuario con ID ${userId} no encontrado`);
    }
    
    return {
      username: user.username,
      email: await this.getUserEmail(userId)
    };
  }
  
  /**
   * Verifica si un usuario es administrador
   */
  static async isAdmin(userId: number): Promise<boolean> {
    const user = await storage.getUser(userId);
    return user?.isAdmin === true;
  }
}