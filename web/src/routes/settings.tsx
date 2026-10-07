import { createFileRoute, Link } from '@tanstack/react-router';
import { PageLayout } from '@/components/page-layout';
import { Section } from '@/components/section';
import { SettingRow } from '@/components/setting-row';
import { ThemePicker } from '@/components/ui/theme-picker';
import { useSampleIntervalSeconds } from '@/hosts/use-live-hosts';
import { type Choice, ChoiceSetting } from '@/settings/choice-setting';
import {
  BYTE_UNITS_BINARY,
  BYTE_UNITS_DECIMAL,
  type ByteUnits,
  PROCESS_COUNT_CHOICES,
  TEMPERATURE_UNIT_CELSIUS,
  TEMPERATURE_UNIT_FAHRENHEIT,
  type TemperatureUnit,
} from '@/settings/defaults';
import {
  chosenUpdateInterval,
  formatInterval,
  updateIntervalChoices,
  updateIntervalSetting,
} from '@/settings/update-interval-choices';
import { useSettings } from '@/settings/use-settings';

export const Route = createFileRoute('/settings')({ component: SettingsRoute });

const BYTE_UNIT_CHOICES: readonly Choice<ByteUnits>[] = [
  { value: BYTE_UNITS_BINARY, label: 'GiB', hint: 'Binary units: 1 GiB is 1024 MiB' },
  { value: BYTE_UNITS_DECIMAL, label: 'GB', hint: 'Decimal units: 1 GB is 1000 MB' },
];
const TEMPERATURE_UNIT_CHOICES: readonly Choice<TemperatureUnit>[] = [
  { value: TEMPERATURE_UNIT_CELSIUS, label: '°C', hint: 'Celsius' },
  { value: TEMPERATURE_UNIT_FAHRENHEIT, label: '°F', hint: 'Fahrenheit' },
];
const PROCESS_COUNT_CHOICE_LIST: readonly Choice<number>[] = PROCESS_COUNT_CHOICES.map((count) => ({
  value: count,
  label: String(count),
}));
const ROWS = 'flex flex-col gap-4';

/**
 * How often the dashboard updates, picked from the server's own interval and a few slower ones.
 *
 * @remarks
 * The fastest choice is whatever the server samples at, so it is only offered once the server has said.
 */
function UpdateIntervalSetting() {
  const [settings, update] = useSettings();
  const sampleIntervalSeconds = useSampleIntervalSeconds().data;
  const title = 'Update every';

  if (sampleIntervalSeconds === undefined) {
    return <SettingRow title={title} description="Waiting for the server to say how often it samples the hosts." />;
  }
  const choices = updateIntervalChoices(sampleIntervalSeconds).map((seconds) => ({
    value: seconds,
    label: formatInterval(seconds),
    hint: seconds === sampleIntervalSeconds ? 'Every sample the server takes' : undefined,
  }));
  return (
    <ChoiceSetting
      title={title}
      description={`How often readings are sent to this browser. The server samples every ${formatInterval(sampleIntervalSeconds)}, so nothing is faster; charts keep every sample at any choice.`}
      choices={choices}
      value={chosenUpdateInterval(settings.updateIntervalSeconds, sampleIntervalSeconds)}
      onChange={(seconds) => update({ updateIntervalSeconds: updateIntervalSetting(seconds, sampleIntervalSeconds) })}
    />
  );
}

/**
 * The settings page: what this browser's user can change about how the dashboard updates and reads.
 */
function SettingsRoute() {
  const [settings, update] = useSettings();

  return (
    <PageLayout
      title="Settings"
      breadcrumbs={<Link to="/">Overview</Link>}
      description="Kept in this browser only. Another browser or device keeps its own."
      content={
        <div className="flex flex-col gap-6 py-4">
          <Section surface="card" title="Updates" content={<UpdateIntervalSetting />} />
          <Section
            surface="card"
            title="Units"
            content={
              <div className={ROWS}>
                <ChoiceSetting
                  title="Byte units"
                  description="How memory, disk space and network rates are written."
                  choices={BYTE_UNIT_CHOICES}
                  value={settings.byteUnits}
                  onChange={(byteUnits) => update({ byteUnits })}
                />
                <ChoiceSetting
                  title="Temperature"
                  description="The unit sensor and GPU temperatures are shown in."
                  choices={TEMPERATURE_UNIT_CHOICES}
                  value={settings.temperatureUnit}
                  onChange={(temperatureUnit) => update({ temperatureUnit })}
                />
              </div>
            }
          />
          <Section
            surface="card"
            title="Host pages"
            content={
              <ChoiceSetting
                title="Top processes"
                description="How many of a host's busiest processes its page lists."
                choices={PROCESS_COUNT_CHOICE_LIST}
                value={settings.processCount}
                onChange={(processCount) => update({ processCount })}
              />
            }
          />
          <Section
            surface="card"
            title="Appearance"
            content={
              <SettingRow
                title="Theme"
                description="Light, dark, or whatever this device is set to."
                actionSlot={({ titleId }) => (
                  <div className="w-28">
                    <ThemePicker variant="compact" aria-labelledby={titleId} />
                  </div>
                )}
              />
            }
          />
        </div>
      }
    />
  );
}
