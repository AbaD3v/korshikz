declare module "pdf-poppler" {
  export function fromPath(
    filePath: string,
    opts: {
      format?: string;
      out_dir?: string;
      out_prefix?: string;
      page?: number | null;
      poppler_path?: string;
    }
  ): {
    bulk: (pages: number[] | null, verbose?: boolean) => Promise<void>;
  };
}