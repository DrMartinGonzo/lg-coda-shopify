import type { RedirectRow } from '../CodaRows';
import type { BaseSyncTableRestParams } from '../allResources';

export declare namespace Redirect {
  type Row = RedirectRow;

  namespace Params {
    interface Sync extends BaseSyncTableRestParams {
      fields: string;
      path?: string;
      target?: string;
    }

    interface Create {
      path: string;
      target: string;
    }

    interface Update {
      path?: string;
      target?: string;
    }
  }
}
