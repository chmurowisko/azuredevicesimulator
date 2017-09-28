import { Stream } from "stream";

export interface BinaryFileData {
    fileName:string;
    data: Stream;
    length: number;
}