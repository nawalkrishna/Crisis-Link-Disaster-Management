import { useParams } from 'react-router';
import { ExternalLink, MapPin, Phone, Settings } from 'lucide-react';
import { NeedRow } from '../../components/domain';
import { CrisisMap } from '../../components/map';
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  PageLoader,
  ProgressBar,
  Spinner,
} from '../../components/ui';
import { isApiError } from '../../lib/api';
import { managesCamp, useCurrentUser } from '../../lib/auth';
import { formatNumber, humanize, statusTone } from '../../lib/format';
import { useCamp, useCampNeeds } from '../../lib/queries';
import NotFoundPage from '../NotFoundPage';

export default function CampPage() {
  const { id = '' } = useParams();
  const camp = useCamp(id);
  const needs = useCampNeeds(id);
  const { data: user } = useCurrentUser();

  if (camp.isPending) return <PageLoader />;
  if (isApiError(camp.error, 400) || isApiError(camp.error, 404)) return <NotFoundPage />;
  if (camp.isError) return <ErrorState error={camp.error} onRetry={() => camp.refetch()} />;

  const c = camp.data;
  const openNeeds = needs.data?.filter((n) => n.status === 'OPEN') ?? [];
  const free = Math.max(0, c.capacity - c.occupancy);

  return (
    <div>
      <PageHeader
        title={c.name}
        back={{ to: `/districts/${c.district.slug}`, label: c.district.name }}
        description={
          <span className="flex items-center gap-1">
            <MapPin className="size-4" aria-hidden /> {c.address}
          </span>
        }
        actions={
          <>
            {managesCamp(user, c.id) && (
              <ButtonLink to={`/manage/camps/${c.id}`} variant="secondary">
                <Settings className="size-4" aria-hidden /> Manage
              </ButtonLink>
            )}
            <ButtonLink to={`/donate?campId=${c.id}`}>Donate to this camp</ButtonLink>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Occupancy</h2>
              <Badge tone={statusTone(c.status)}>{humanize(c.status)}</Badge>
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums">
              {formatNumber(c.occupancy)}
              <span className="text-base font-normal text-slate-500">
                {' '}
                / {formatNumber(c.capacity)}
              </span>
            </p>
            <div className="mt-2">
              <ProgressBar value={c.occupancy} max={c.capacity} label="Occupancy" />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {c.status === 'CLOSED' ? 'This camp is closed.' : `${formatNumber(free)} places free`}
            </p>
          </Card>
          {(c.contactName || c.contactPhone) && (
            <Card>
              <h2 className="font-semibold">Camp contact</h2>
              {c.contactName && <p className="mt-2 text-slate-700">{c.contactName}</p>}
              {c.contactPhone && (
                <a
                  href={`tel:${c.contactPhone}`}
                  className="mt-1 inline-flex items-center gap-1 font-medium underline"
                >
                  <Phone className="size-4" aria-hidden /> {c.contactPhone}
                </a>
              )}
            </Card>
          )}
          {c.latitude !== null && c.longitude !== null && (
            <CrisisMap
              camps={[
                { ...c, district: c.district.name, latitude: c.latitude, longitude: c.longitude },
              ]}
              className="h-56"
              label={`Map showing ${c.name}`}
            />
          )}
          {c.latitude !== null && c.longitude !== null && (
            <a
              className="inline-flex items-center gap-1 text-sm font-medium underline"
              href={`https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=15/${c.latitude}/${c.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              Open in map <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
        </div>

        <section className="lg:col-span-2" aria-labelledby="needs-heading">
          <h2 id="needs-heading" className="mb-3 text-xl font-semibold">
            What this camp needs
          </h2>
          <Card className="py-0">
            {needs.isPending ? (
              <Spinner />
            ) : needs.isError ? (
              <ErrorState error={needs.error} />
            ) : openNeeds.length === 0 ? (
              <div className="py-5">
                <EmptyState title="No open needs">General donations are still welcome.</EmptyState>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {openNeeds.map((need) => (
                  <NeedRow key={need.id} need={need} />
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
