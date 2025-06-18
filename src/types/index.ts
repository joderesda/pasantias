// Tipos de pregunta disponibles
export type QuestionType = 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'boolean';

// Roles de usuario
export type UserRole = 'admin' | 'user' | 'analista';

// Usuario
export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
}

// Opción para preguntas de selección
export interface Option {
  id: string;
  text: string;
  subQuestions?: Question[];
}

// Estructura de una pregunta
export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  options?: Option[];
  includeInPowerBI: boolean;
  powerBIFieldName?: string;
  parentId?: string;
  parentOptionId?: string;
}

// Estructura de un formulario
export interface Form {
  id: string;
  name: string;
  description: string;
  questions: Question[];
  createdAt: number;
  updatedAt: number;
  version: number;
}

// Respuesta a una pregunta individual
export interface QuestionResponse {
  questionId: string;
  value: string | string[] | number | boolean | null;
}

// Respuesta completa a un formulario
export interface FormResponse {
  id: string;
  formId: string;
  formVersion: number;
  responses: QuestionResponse[];
  createdAt: number;
  updatedOffline: boolean;
  userId: string;
  username: string;
}

// Estado del contexto para gestión de formularios
export interface FormContextState {
  forms: Form[];
  currentForm: Form | null;
  responses: Record<string, FormResponse[]>;
  isLoading: boolean;
  error: string | null;
}

// Estado del contexto de autenticación
export interface AuthContextState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}