import { useParams, useSearchParams } from 'react-router';
import { ExternalLink } from 'lucide-react';
import {
  Badge,
  ButtonLink,
  ErrorState,
  PageHeader,
  PageLoader,
  ProgressBar,
  Tabs,
} from '../../components/ui';
import { isApiError } from '../../lib/api';
import { managesCamp, useCurrentUser } from '../../lib/auth';
import { formatNumber, humanize, statusTone } from '../../lib/format';
import { useCamp } from '../../lib/queries';
import { ForbiddenPage } from '../ForbiddenPage';
import NotFoundPage from '../NotFoundPage';
import { DonationsTab } from './camp/DonationsTab';
import { EvacueesTab } from './camp/EvacueesTab';
import { NeedsTab } from './camp/NeedsTab';
import { SettingsTab } from './camp/SettingsTab';
import { TasksTab } from './camp/TasksTab';

const TABS = ['evacuees', 'needs', 'donations', 'tasks', 'settings'] as const;
type Tab = (typeof TABS)[number];

export default function ManageCampPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { data: user } = useCurrentUser();
  const camp = useCamp(id);

  const tab: Tab = (TABS as readonly string[]).includes(params.get('tab') ?? '')
    ? (params.get('tab') as Tab)
    : 'evacuees';

  if (user && !managesCamp(user, id)) return <ForbiddenPage user={user} />;
  if (camp.isPending) return <PageLoader />;
  if (isApiError(camp.error, 400) || isApiError(camp.error, 404)) return <NotFoundPage />;
  if (camp.isError) return <ErrorState error={camp.error} onRetry={() => camp.refetch()} />;

  const c = camp.data;
  return (
    <div>
      <PageHeader
        title={c.name}
        back={{ to: '/manage', label: 'Camps' }}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <Badge tone={statusTone(c.status)}>{humanize(c.status)}</Badge>
            <span className="text-sm">
              {formatNumber(c.occupancy)} / {formatNumber(c.capacity)} people
            </span>
            <span className="w-32">
              <ProgressBar value={c.occupancy} max={c.capacity} label="Occupancy" />
            </span>
          </span>
        }
        actions={
          <ButtonLink to={`/camps/${c.id}`} variant="secondary">
            Public page <ExternalLink className="size-4" aria-hidden />
          </ButtonLink>
        }
      />
      <Tabs
        label="Camp management"
        value={tab}
        onChange={(t) => setParams(t === 'evacuees' ? {} : { tab: t }, { replace: true })}
        tabs={[
          { value: 'evacuees', label: 'People', count: c.occupancy },
          { value: 'needs', label: 'Needs', count: c.openNeeds },
          { value: 'donations', label: 'Donations' },
          { value: 'tasks', label: 'Tasks' },
          { value: 'settings', label: 'Settings' },
        ]}
      />
      {tab === 'evacuees' && <EvacueesTab camp={c} />}
      {tab === 'needs' && <NeedsTab camp={c} />}
      {tab === 'donations' && <DonationsTab camp={c} />}
      {tab === 'tasks' && <TasksTab camp={c} />}
      {tab === 'settings' && <SettingsTab camp={c} />}
    </div>
  );
}
