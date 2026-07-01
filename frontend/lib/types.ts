export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled"
export type TaskPriority = "low" | "medium" | "high" | "urgent"

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  category: string | null
  due_date: string | null
  estimated_minutes: number | null
  completed_at: string | null
  list_id: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export interface TaskList {
  id: string
  user_id: string
  name: string
  created_at: string
}

// Mixer de sons do modo foco
export interface SoundTrack {
  id: string
  label: string
  src?: string // arquivo/URL; ausente quando sintetizado
  synth?: "white" | "brown"
  volume: number // 0–1
  active: boolean
}

export interface TimeBlock {
  id: string
  user_id: string
  task_id: string | null
  title: string
  description: string | null
  start_time: string
  end_time: string
  color: string
  is_recurring: boolean
  recurrence_rule: string | null
  created_at: string
  updated_at: string
}

export interface Reminder {
  id: string
  user_id: string
  content: string
  remind_date: string // YYYY-MM-DD (dia ao qual o lembrete pertence)
  remind_time: string | null // HH:MM[:SS] (hora opcional p/ notificação)
  done: boolean
  created_at: string
}

export interface DayNote {
  id: string
  user_id: string
  note_date: string // YYYY-MM-DD (data local do dia)
  content: string
  updated_at: string
}

export interface Profile {
  id: string
  name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export interface AIConversation {
  id: string
  user_id: string
  messages: AIMessage[]
  title: string | null
  created_at: string
  updated_at: string
}

export interface AIMessage {
  role: "user" | "assistant"
  content: string
  timestamp: string
}
