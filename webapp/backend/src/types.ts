import type { AuthService } from "./modules/auth/types";
import type { GolemService, JobService } from "./modules/job/types";

export interface ServiceContainer {
  jobService: JobService;
  golemService: GolemService;
  authService: AuthService;
}
