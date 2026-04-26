import { registerPipeline } from '../../registerPipeline';
import { x, waitForXContent } from '../../../pipeline/profiles/x';

registerPipeline([x], waitForXContent);
