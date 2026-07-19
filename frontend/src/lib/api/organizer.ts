import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";

export interface DocumentResponse {
  id: number;
  document_type: string;
  url: string;
  status: string;
  uploaded_at: string;
}

export interface OrganizerApplicationResponse {
  id: number;
  business_name: string;
  business_type: string;
  business_email: string;
  business_phone: string;
  website: string;
  description: string;
  status: string;
  submitted_at: string;
  reviewed_at: string;
  notes: string;
  documents: DocumentResponse[];
}

export async function applyOrganizer(formData: FormData): Promise<ApiResponse<OrganizerApplicationResponse>> {
  return apiRequest<OrganizerApplicationResponse>("/api/organizer/apply", {
    method: "POST",
    body: formData,
  });
}

export async function getOrganizerApplication(): Promise<ApiResponse<OrganizerApplicationResponse>> {
  return apiRequest<OrganizerApplicationResponse>("/api/organizer/application", {
    method: "GET",
  });
}

export async function updateOrganizerApplication(formData: FormData): Promise<ApiResponse<OrganizerApplicationResponse>> {
  return apiRequest<OrganizerApplicationResponse>("/api/organizer/application", {
    method: "PUT",
    body: formData,
  });
}

export async function deleteOrganizerApplication(): Promise<ApiResponse<void>> {
  return apiRequest<void>("/api/organizer/application", {
    method: "DELETE",
  });
}
