export interface AboutValue {
  number: string;
  title: string;
  description: string;
}

export interface AboutEducation {
  year: string;
  title: string;
  institution: string;
  detail: string;
}

export interface About {
  title: string;
  image: string;
  intro: string[];
  values: AboutValue[];
  skills: string[];
  education: AboutEducation[];
}
