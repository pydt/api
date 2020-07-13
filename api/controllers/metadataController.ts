import { Get, Route, Tags } from 'tsoa';
import { provideSingleton } from '../../lib/ioc';
import { PydtMetadata, PYDT_METADATA, PYDT_METADATA_HASH } from '../../lib/metadata/metadata';

@Route('metadata')
@Tags('metadata')
@provideSingleton(MetadataController)
export class MetadataController {
  @Get('')
  public metadata(): HashedPydtMetadata {
    return {
      metadata: PYDT_METADATA,
      hash: PYDT_METADATA_HASH
    };
  }
}

export interface HashedPydtMetadata {
  metadata: PydtMetadata;
  hash: string;
}
