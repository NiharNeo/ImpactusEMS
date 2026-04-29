export function generateGoogleCalendarUrl(event: {
  name: string;
  description?: string;
  location?: string;
  event_date: string;
  event_end_date?: string;
}) {
  const base = "https://www.google.com/calendar/render?action=TEMPLATE";
  
  const title = encodeURIComponent(event.name);
  const details = encodeURIComponent(event.description || "");
  const location = encodeURIComponent(event.location || "");
  
  // Format dates: YYYYMMDDTHHMMSSZ
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };
  
  const start = formatDate(event.event_date);
  const end = event.event_end_date ? formatDate(event.event_end_date) : start;
  
  return `${base}&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
}
