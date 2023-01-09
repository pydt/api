export interface ScheduledJobKey {
  jobType: string;
  scheduledTime: number;
}

export interface ScheduledJob extends ScheduledJobKey {
  gameIds: string[];
}
