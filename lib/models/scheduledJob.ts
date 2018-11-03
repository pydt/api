export interface ScheduledJobKey {
  jobType: string;
  scheduledTime: Date;
}

export interface ScheduledJob extends ScheduledJobKey {
  gameIds: string[];
}
