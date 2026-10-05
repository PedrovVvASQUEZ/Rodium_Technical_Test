export type HealthStatus = {
  status: 'ok';
  service: 'backend';
};

export const getHealthStatus = (): HealthStatus => ({
  status: 'ok',
  service: 'backend',
});