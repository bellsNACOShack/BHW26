import { apiRequest } from "@/lib/api-client";
import type {
  CreateLogEntryPayload,
  LogEntry,
  LogEntryDetail,
  LogEntryFilters,
  LogEntryListItem,
  ReviewLogEntryPayload,
  SignLogEntryPayload,
  UpdateLogEntryPayload,
} from "../types";

export async function getLogEntries(filters: LogEntryFilters = {}) {
  const { logs } = await apiRequest<{ logs: LogEntryListItem[] }>("/logs", { query: { ...filters } });
  return logs;
}

export async function getLogEntry(id: string) {
  const { log_entry } = await apiRequest<{ log_entry: LogEntryDetail }>(`/logs/${id}`);
  return log_entry;
}

export async function createLogEntry(payload: CreateLogEntryPayload) {
  const { log_entry } = await apiRequest<{ log_entry: LogEntry }>("/logs", { method: "POST", body: payload });
  return log_entry;
}

export async function updateLogEntry(id: string, payload: UpdateLogEntryPayload) {
  const { log_entry } = await apiRequest<{ log_entry: LogEntry }>(`/logs/${id}`, { method: "PUT", body: payload });
  return log_entry;
}

export function deleteLogEntry(id: string) {
  return apiRequest<{ message: string }>(`/logs/${id}`, { method: "DELETE" });
}

export async function submitLogEntry(id: string) {
  const { log_entry } = await apiRequest<{ log_entry: LogEntry }>(`/logs/${id}/submit`, { method: "POST" });
  return log_entry;
}

export async function reviewLogEntry(id: string, payload: ReviewLogEntryPayload) {
  const { log_entry } = await apiRequest<{ log_entry: LogEntry }>(`/logs/${id}/review`, {
    method: "POST",
    body: payload,
  });
  return log_entry;
}

export function signLogEntry(id: string, payload: SignLogEntryPayload) {
  return apiRequest<{ log_entry: LogEntry; integrity_hash: string; message: string }>(`/logs/${id}/sign`, {
    method: "POST",
    body: payload,
  });
}
