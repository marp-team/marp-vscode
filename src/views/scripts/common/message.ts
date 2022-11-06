export type MessageDefinitions = Record<string, any>

export type Message<
  Definitions extends MessageDefinitions,
  T extends keyof Definitions = keyof Definitions
> = T extends never ? never : { type: T; opts: Definitions[T] }

export const isMessage = <Definitions extends MessageDefinitions>(
  obj: unknown
): obj is Message<Definitions> =>
  typeof obj === 'object' && !!obj && 'type' in obj && 'opts' in obj
