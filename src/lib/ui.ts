export type Perform = (work: () => Promise<unknown>, success?: string) => Promise<boolean>;
