export interface Event {
  event_id: string | number;
  id?: string | number;
  title: string;
  event_date: string;
  description?: string;
  event_type?: string;
  color_code?: string;
}

export interface GoogleHoliday {
  title: string;
  date: string;
  month: string;
}

export interface FormData {
  title: string;
  date: string;
  description: string;
  type: string;
  color: string;
}

export interface HolidayItem {
  name: string;
  date: string;
  category: string;
}
