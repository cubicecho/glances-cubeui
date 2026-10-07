import { SettingRow } from '@/components/setting-row';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

/** One option of a {@link ChoiceSetting}. */
export interface Choice<TValue extends string | number | boolean> {
  /** What is stored when it is picked. */
  value: TValue;
  /** The words on its segment. */
  label: string;
  /** What picking it means, as the segment's tooltip. */
  hint?: string;
}

interface ChoiceSettingProps<TValue extends string | number | boolean> {
  /** What the setting is called. It names the group of options. */
  title: string;
  /** One line on what the setting changes. */
  description: string;
  /** The options, in the order drawn. */
  choices: readonly Choice<TValue>[];
  /** The option that is picked now. */
  value: TValue;
  /** Told the value of each option the reader picks. */
  onChange: (value: TValue) => void;
}

/** A segment as wide as its label. The row gives the group no width to share out, so sharing would cut labels short. */
const SEGMENT = 'min-w-fit flex-none';

/**
 * One setting picked from a short list: its title and description beside a row of segments.
 *
 * @param props - The setting's words, its options, the current value and what to tell of a change.
 */
export function ChoiceSetting<TValue extends string | number | boolean>({
  title,
  description,
  choices,
  value,
  onChange,
}: ChoiceSettingProps<TValue>) {
  // The radio group speaks strings, so each option is found again by its written value.
  const pick = (written: string): void => {
    const picked = choices.find((choice) => String(choice.value) === written);
    if (picked !== undefined) {
      onChange(picked.value);
    }
  };

  return (
    <SettingRow
      title={title}
      description={description}
      actionSlot={({ titleId, descriptionId }) => (
        <RadioGroup
          variant="segmented"
          className="w-auto"
          value={String(value)}
          onValueChange={pick}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          {choices.map((choice) => (
            <RadioGroupItem
              key={String(choice.value)}
              value={String(choice.value)}
              label={choice.label}
              hint={choice.hint}
              className={SEGMENT}
            />
          ))}
        </RadioGroup>
      )}
    />
  );
}
