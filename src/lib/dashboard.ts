import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/objects/tasks/models/Filter";
import { getHubspotClient, getOwnerId } from "./hubspot";

export interface DashboardStats {
  overdueCount: number;
  dueTodayCount: number;
  completedThisWeekCount: number;
  openByPriority: { HIGH: number; MEDIUM: number; LOW: number; NONE: number };
}

async function countTasks(
  filters: Array<{ propertyName: string; operator: FilterOperatorEnum; value: string }>
): Promise<number> {
  const client = getHubspotClient();
  const result = await client.crm.objects.tasks.searchApi.doSearch({
    filterGroups: [{ filters }],
    limit: 1,
    properties: [],
  });
  return result.total;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const ownerId = await getOwnerId();
  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const endOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const ownerFilter = { propertyName: "hubspot_owner_id", operator: FilterOperatorEnum.Eq, value: ownerId };
  const notCompleted = { propertyName: "hs_task_status", operator: FilterOperatorEnum.Neq, value: "COMPLETED" };

  const [overdueCount, dueTodayCount, completedThisWeekCount, openTotal, high, medium, low] =
    await Promise.all([
      countTasks([
        ownerFilter,
        notCompleted,
        { propertyName: "hs_timestamp", operator: FilterOperatorEnum.Lt, value: String(startOfToday.getTime()) },
      ]),
      countTasks([
        ownerFilter,
        notCompleted,
        { propertyName: "hs_timestamp", operator: FilterOperatorEnum.Gte, value: String(startOfToday.getTime()) },
        { propertyName: "hs_timestamp", operator: FilterOperatorEnum.Lte, value: String(endOfToday.getTime()) },
      ]),
      countTasks([
        ownerFilter,
        { propertyName: "hs_task_status", operator: FilterOperatorEnum.Eq, value: "COMPLETED" },
        { propertyName: "hs_task_completion_date", operator: FilterOperatorEnum.Gte, value: String(sevenDaysAgo.getTime()) },
      ]),
      countTasks([ownerFilter, notCompleted]),
      countTasks([ownerFilter, notCompleted, { propertyName: "hs_task_priority", operator: FilterOperatorEnum.Eq, value: "HIGH" }]),
      countTasks([ownerFilter, notCompleted, { propertyName: "hs_task_priority", operator: FilterOperatorEnum.Eq, value: "MEDIUM" }]),
      countTasks([ownerFilter, notCompleted, { propertyName: "hs_task_priority", operator: FilterOperatorEnum.Eq, value: "LOW" }]),
    ]);

  // Tarefas sem prioridade não têm um valor consistente para filtrar via
  // busca (a propriedade fica em branco, não "NONE") — chega-se ao total por
  // subtração em vez de um Eq frágil.
  const none = Math.max(openTotal - high - medium - low, 0);

  return {
    overdueCount,
    dueTodayCount,
    completedThisWeekCount,
    openByPriority: { HIGH: high, MEDIUM: medium, LOW: low, NONE: none },
  };
}
