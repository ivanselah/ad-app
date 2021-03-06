import axios, { AxiosInstance } from 'axios';
import qs from 'qs';
import { AdInquire, CommonCode, ConcatType, LectureInquire, PresentInquire, SpaceUserInfo, UserProps } from '../types';

interface IApiProvider {
  setSpaceAndMemberId(spaceId: number, memberId: number): void;
  getMemberId(): number;
  setSelectedLectureId(lectureId: number): void;
  getLectureId(): number;
  //
  getAdPageSize(): Promise<boolean | undefined>;
  getAdInquire(): Promise<AdInquire['results'] | undefined>;
  //
  setNickNameWithMemberId(): void;
  //
  getPresentInquire(lectureResults: LectureInquire['lectures'], startDate: string, endDate: string): Promise<ConcatType | undefined>;
  postPresent(presentId: number, present: string): void;
  putPresent(lectureId: number): Promise<CommonCode>;
  deletePresent(presentId: number): void;
  //
  getLectureInquire(): Promise<LectureInquire['lectures'] | undefined>;
  postLecture(lectureId: number, lectureName: string, startTime: string, endTime: string): Promise<CommonCode>;
  putLecture(lectureName: string, startTime: string, endTime: string): Promise<CommonCode>;
  deleteLecture(lectureId: number): void;
}

axios.defaults.paramsSerializer = (params) => {
  return qs.stringify(params);
};
class ApiCallers implements IApiProvider {
  private apiBase: AxiosInstance;
  private _spaceId: number = 0;
  private _memberId: number = 0;
  private _lectureId: number = 0;
  private _tatolElement: number = 0;
  private nickNameObject: UserProps = {};
  private constructor() {
    this.apiBase = axios.create({
      baseURL: 'https://api.meetpage.io',
      withCredentials: true,
    });
  }
  private getNickName(memberId: number): string {
    if (this.nickNameObject[String(memberId)]) {
      return this.nickNameObject[String(memberId)].memberName;
    }
    return '';
  }
  static makeApi(): ApiCallers {
    return new ApiCallers();
  }

  setSpaceAndMemberId(spaceId: number, memberId: number) {
    this._spaceId = spaceId;
    this._memberId = memberId;
  }

  getMemberId(): number {
    return this._memberId;
  }

  setSelectedLectureId(lectureId: number) {
    this._lectureId = lectureId;
  }

  getLectureId(): number {
    return this._lectureId;
  }

  getAdPageSize = async (): Promise<boolean | undefined> => {
    try {
      const {
        data: { page },
      }: { data: { page: AdInquire['page'] } } = await this.apiBase.get(`/attend/${this._spaceId}`);
      if (page) {
        this._tatolElement = page.totalElements;
        return true;
      }
      return undefined;
    } catch (e) {
      console.error(e);
    }
  };

  getAdInquire = async (): Promise<AdInquire['results'] | undefined> => {
    try {
      const { data }: { data: AdInquire } = await this.apiBase.get(`/attend/${this._spaceId}`, {
        params: {
          size: this._tatolElement,
        },
      });
      if (data?.results != null) {
        return data?.results;
      }
    } catch (e) {
      console.error(e);
      throw new Error('getAdInquire Faild');
    }
  };

  setNickNameWithMemberId = async () => {
    try {
      const {
        data: { members },
      }: { data: { members: SpaceUserInfo } } = await this.apiBase(`/v2/space/${this._spaceId}`);
      members?.forEach((user) => {
        const keyName = user.id.toString();
        this.nickNameObject[keyName] = { memberId: user.id, memberName: user.name };
      });
    } catch (e) {
      console.error(e);
    }
  };

  getPresentInquire = async (lectureResults: LectureInquire['lectures'], startDate: string, endDate: string): Promise<ConcatType | undefined> => {
    let adInfoConcat: ConcatType = {};
    try {
      const ok = await Promise.allSettled(
        lectureResults.map(async (info) => {
          const {
            data: { presents },
          }: { data: { presents: PresentInquire['presents'] } } = await this.apiBase.get(`/present/${info.lectureId}`, {
            params: {
              startDate,
              endDate,
            },
          });
          adInfoConcat = {
            ...adInfoConcat,
            [String(info.lectureId)]: {
              lectureId: info.lectureId,
              spaceId: info.spaceId,
              lectureName: info.lectureName,
              startTime: info.startTime,
              endTime: info.endTime,
              person: presents?.map((item) => {
                return {
                  ...item,
                  memberName: this.getNickName(item.memberId),
                };
              }),
            },
          };
        })
      );
      if (ok.some((all) => all.status === 'fulfilled')) {
        return adInfoConcat;
      }
      return undefined;
    } catch (e) {
      console.error(e);
      throw new Error('getPresentInquire Faild');
    }
  };

  postPresent = async (presentId: number, present: string) => {
    try {
      await this.apiBase.post(`/present/${presentId}`, qs.stringify({ present }));
    } catch (e) {
      console.error(e);
      throw new Error('postPresent Faild');
    }
  };

  putPresent = async (lectureId: number): Promise<CommonCode> => {
    try {
      const params = { _method: 'put', lectureId, memberId: this._memberId, present: 'absent' };
      const response = await this.apiBase.post(`/present/${lectureId}`, qs.stringify(params));
      return response.data;
    } catch (e) {
      console.error(e);
      throw new Error('putPresent Faild');
    }
  };

  deletePresent = async (presentId: number) => {
    try {
      await this.apiBase.delete(`/present/${presentId}`);
    } catch (e) {
      console.error(e);
      throw new Error('deletePresent Faild');
    }
  };

  getLectureInquire = async (): Promise<LectureInquire['lectures'] | undefined> => {
    try {
      const { data }: { data: LectureInquire } = await this.apiBase.get(`/lecture/${this._spaceId}`);
      if (data.lectures != null) {
        return data.lectures;
      }
      return undefined;
    } catch (e) {
      console.error(e);
      throw new Error('getLectureInquire Faild');
    }
  };

  putLecture = async (lectureName: string, startTime: string, endTime: string): Promise<CommonCode> => {
    try {
      const params = { _method: 'put', spaceId: this._spaceId, lectureName, startTime, endTime };
      const { data }: { data: CommonCode } = await this.apiBase.post(`/lecture/${this._spaceId}`, qs.stringify(params));
      return data;
    } catch (e) {
      console.error(e);
      throw new Error('putLecture Faild');
    }
  };

  postLecture = async (lectureId: number, lectureName: string, startTime: string, endTime: string): Promise<CommonCode> => {
    try {
      const params = { lectureName, startTime, endTime };
      const { data }: { data: CommonCode } = await this.apiBase.post(`/lecture/${lectureId}`, qs.stringify(params));
      return data;
    } catch (e) {
      console.error(e);
      throw new Error('postLecture Faild');
    }
  };

  deleteLecture = async (lectureId: number) => {
    console.log(lectureId);
    try {
      const temp = await this.apiBase.delete(`/lecture/${lectureId}`);
      console.log(temp);
    } catch (e) {
      console.error(e);
      throw new Error('deleteLecture Faild');
    }
  };
}

export default ApiCallers;
