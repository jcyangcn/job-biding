"""Import job posts from spreadsheet URLs (newest dates first)."""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from html import unescape
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.job_post_service import create_job_post
from app.models import JobPostCreateRequest

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}

DEAD_PHRASES = (
    "no longer available",
    "page not found",
    "job is closed",
    "posting has expired",
    "position has been filled",
    "job not found",
    "this job is no longer",
    "opening is closed",
)

# MATHEUS tab — sorted newest date first (04/29/2026 then 04/28/2026).
SPREADSHEET_ROWS: list[dict] = [
    {"date": "04/29/2026", "role": "Senior Full Stack Engineer", "company": "pluribusdigital", "url": "https://pluribusdigital.com/join/openings?gh_jid=7711877003"},
    {"date": "04/29/2026", "role": "Senior Full Stack Software Development Engineer - AI", "company": "Experian", "url": "https://jobs.smartrecruiters.com/Experian/744000123312547-senior-full-stack-software-development-engineer-ai-"},
    {"date": "04/29/2026", "role": "Application Software Developer (Full Stack Developer)", "company": "vivsofttechnologiesfa", "url": "https://vivsofttechnologiesfa.applytojob.com/apply/65z02havX5/Application-Software-Developer-Full-Stack-Developer"},
    {"date": "04/29/2026", "role": "Senior Software Engineer, Frontend, Revenue Growth", "company": "Paperless", "url": "https://job-boards.greenhouse.io/paperlesspost/jobs/7861970"},
    {"date": "04/29/2026", "role": "UI/UX Developer", "company": "Parsons Corporation", "url": "https://parsons.wd5.myworkdayjobs.com/en-US/Search/job/US---Remote-Any-Location/UI-UX-Developer_R180185-1?source=LinkedIn"},
    {"date": "04/29/2026", "role": "Javascript - Senior Developers - AI Training - Nashville, USA", "company": "Prolific", "url": "https://job-boards.eu.greenhouse.io/prolificacademicltd/jobs/4853354101?gh_src=jyu557p2teu"},
    {"date": "04/29/2026", "role": "Full-Stack Software Engineer", "company": "jackandjill", "url": "https://www.jackandjill.ai/jobs/full-stack-software-engineer-at-fast-growing-voice-ai-startup-e6703cec-f86f-4542-8ded-75b1cd4ede4c?src=LinkedIn"},
    {"date": "04/29/2026", "role": "Frontend Engineering Expert", "company": "24-MAG", "url": "https://24-mag.careers-page.com/jobs/38f04fb3-5545-4c2b-8d5c-c3c45d733f97?utm_medium=free_job_board&utm_source=linkedin"},
    {"date": "04/29/2026", "role": "Senior Front end engineer(Vue JS)", "company": "IQVIA", "url": "https://jobs.iqvia.com/en/jobs/R1526277-0?source=LinkedIn_Slots"},
    {"date": "04/29/2026", "role": "Staff Software Engineer (React Native)", "company": "PrizePicks", "url": "https://www.prizepicks.com/position?gh_jid=7708788003&gh_src=351367c33us"},
    {"date": "04/29/2026", "role": "Software Engineer II", "company": "Honeywell International", "url": "https://ibqbjb.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/Honeywell/job/146736?utm_medium=jobboard&utm_source=linkedin"},
    {"date": "04/29/2026", "role": "Software Engineer II (Front-End)", "company": "Demandbase", "url": "https://jobs.ashbyhq.com/demandbase/3cfae15a-fb35-4f24-8802-5b70689537b8?ashby_src=linkedIn&utm_source=LinkedIn"},
    {"date": "04/29/2026", "role": "Sr Software Engineer, Applications", "company": "Basis", "url": "https://jobs.lever.co/basis/bb213682-6e49-48d4-bdfe-3b17aba79366"},
    {"date": "04/29/2026", "role": "Frontend Vue.js Developer - Contingent", "company": "aretum", "url": "https://jobs.workable.com/view/13KbzCmr1Kw6Wv6hEoH8b4/remote-frontend-vue.js-developer---contingent-in-mclean-at-aretum"},
    {"date": "04/29/2026", "role": "Staff Software Engineer", "company": "paradigminccareersopenpositions", "url": "https://job-boards.greenhouse.io/paradigminccareersopenpositions/jobs/4689739005"},
    {"date": "04/29/2026", "role": "Software Engineer II - Collaborative Web Platform", "company": "pantheon", "url": "https://pantheon.io/about/careers/detail?gh_jid=7843933"},
    {"date": "04/29/2026", "role": "Sr. Full Stack Digital Services Software Engineer #1821", "company": "WellmarkInc", "url": "https://jobs.smartrecruiters.com/WellmarkInc/744000122743941-sr-full-stack-digital-services-software-engineer-1821"},
    {"date": "04/29/2026", "role": "Front-End / Full Stack Developer (React + Java)", "company": "honorfoods", "url": "https://job-boards.greenhouse.io/honorfoods/jobs/8527168002"},
    {"date": "04/29/2026", "role": "Lead Full Stack Engineer, Marketing Technology - Capital One Software (Remote)", "company": "capitalone", "url": "https://capitalone.wd12.myworkdayjobs.com/capital_one/job/Richmond-VA/Lead-Full-Stack-Engineer--Marketing-Technology---Capital-One-Software--Remote-_R240380-1"},
    {"date": "04/29/2026", "role": "Full Stack Engineer II", "company": "republic", "url": "https://republic.wd5.myworkdayjobs.com/republic/job/USA---Remote/Full-Stack-Engineer-II_R-169800"},
    {"date": "04/29/2026", "role": "Full Stack Engineer", "company": "tubescience52", "url": "https://job-boards.greenhouse.io/tubescience52/jobs/5120580007"},
    {"date": "04/29/2026", "role": "Senior Full-Stack Engineer - Production Planning", "company": "afresh", "url": "https://job-boards.greenhouse.io/afresh/jobs/5983513004"},
    {"date": "04/29/2026", "role": "Lead Full Stack Engineer", "company": "ttcportals", "url": "https://ness-usa.ttcportals.com/jobs/17652059"},
    {"date": "04/29/2026", "role": "Jr. Full Stack Developer", "company": "cutsforth", "url": "https://careers.cutsforth.com/apply/w2Mtc42pIw/Jr-Full-Stack-Developer"},
    {"date": "04/29/2026", "role": "Staff Software Engineer", "company": "stord", "url": "https://stord.wd503.myworkdayjobs.com/stord_external_career/job/Remote-United-States/Principal-Software-Engineer_JR101602"},
    {"date": "04/29/2026", "role": "Remote Fullstack Software Engineer", "company": "rebellion", "url": "https://jobs.gohire.io/rebellion-defenses-o6zelp4x/remote-fullstack-software-engineer-284228/?ref=aHR0cHM6Ly9oaXJpbmcuY2FmZS8="},
    {"date": "04/29/2026", "role": "Staff Engineer", "company": "unqork", "url": "https://unqork.com/career-details/?gh_jid=8511902002"},
    {"date": "04/29/2026", "role": "Software Developer (Learning Systems)", "company": "flvs", "url": "https://flvs.wd1.myworkdayjobs.com/flvs_jobs/job/FL---Home-Office/Software-Developer--Learning-Systems-_R9283"},
    {"date": "04/29/2026", "role": "Senior Software Engineer - Cross-chain Systems", "company": "connextnetwork", "url": "https://join.com/companies/connextnetwork/16078379-senior-software-engineer-cross-chain-systems?pid=0a9968ed210507e82356"},
    {"date": "04/29/2026", "role": "Software Engineer, Core Platform", "company": "cribl", "url": "https://cribl.io/job-detail/5844014004/"},
    {"date": "04/29/2026", "role": "Software Engineer II", "company": "marinerfinance", "url": "https://careers-marinerfinance.icims.com/jobs/1336/job?utm_source=hiringcafe_integration&iis=Job+Board&iisn=HiringCafe"},
    {"date": "04/29/2026", "role": "Senior Full Stack Engineer (Node / React / AWS)", "company": "jahnelgroup", "url": "https://www.jahnelgroup.com/apply.html?gh_jid=5108881007"},
    {"date": "04/29/2026", "role": "Senior/Staff Software Engineer", "company": "homebound", "url": "https://jobs.ashbyhq.com/homebound/591e220d-3fd0-44f2-ae6e-5e647762bd19"},
    {"date": "04/29/2026", "role": "Fullstack Software Engineer", "company": "workshop", "url": "https://job-boards.greenhouse.io/workshop/jobs/5009207007"},
    {"date": "04/29/2026", "role": "Software Engineer", "company": "n3xt", "url": "https://ats.rippling.com/n3xt-jobs/jobs/3e1e9861-df5a-4313-bd34-427a8fef4666"},
    {"date": "04/29/2026", "role": "Senior Software Development Engineer", "company": "zillow", "url": "https://zillow.wd5.myworkdayjobs.com/zillow_group_external/job/Remote-USA/Senior-Software-Development-Engineer_P748924-1"},
    {"date": "04/29/2026", "role": "Software Engineer, Production Support", "company": "fieldguide", "url": "https://jobs.ashbyhq.com/fieldguide/958a9f43-9de0-4a38-b527-75bb20ff1c09"},
    {"date": "04/29/2026", "role": "Software Engineer II", "company": "kapitus", "url": "https://job-boards.greenhouse.io/kapitus/jobs/4231980009"},
    {"date": "04/29/2026", "role": "Developer III", "company": "holmanautogroup", "url": "https://holmanautogroup.wd1.myworkdayjobs.com/holmanenterprisescareers/job/Remote-NJ-US/Developer-III_R0054729"},
    {"date": "04/29/2026", "role": "Lead Software Engineer", "company": "emeraldx", "url": "https://ats.rippling.com/emeraldx/jobs/031d6ba6-31bc-42a0-b955-cc22a638da66"},
    {"date": "04/29/2026", "role": "Senior Software Engineer", "company": "digible", "url": "https://job-boards.greenhouse.io/digible/jobs/5977315004"},
    {"date": "04/29/2026", "role": "Senior Full Stack React/Node.js Developer", "company": "mobomo", "url": "https://mobomo.applytojob.com/apply/MBWPBtk15l/SeniorFull-Stack-ReactNodejsDeveloper"},
    {"date": "04/29/2026", "role": "Senior Software Developer – Applications", "company": "learntastic", "url": "https://learntastic.applytojob.com/apply/kRM5QPlwwx/Senior-Software-Developer-Applications"},
    {"date": "04/29/2026", "role": "Sr. Software Engineer, Backend- Rotten Tomatoes", "company": "Versant3", "url": "https://jobs.smartrecruiters.com/Versant3/744000123301569-sr-software-engineer-backend-rotten-tomatoes"},
    {"date": "04/29/2026", "role": "Frontend (Full-Stack) Engineering Lead", "company": "equal-parts", "url": "https://jobs.workable.com/view/4wW8WL8Wan2Zd5LERsGiK6/remote-frontend-(full-stack)-engineering-lead-in-pittsburgh-at-equal-parts"},
    {"date": "04/29/2026", "role": "Senior Software Engineer, Full-Stack (InsurTech)", "company": "nerdwallet", "url": "https://jobs.ashbyhq.com/nerdwallet/58914a67-535a-4ca2-9b67-fbc0307969bb"},
    {"date": "04/29/2026", "role": "Senior Full Stack Developer (JS, AWS)", "company": "capstoneintegratedsolutions", "url": "https://job-boards.greenhouse.io/capstoneintegratedsolutions/jobs/5108336007"},
    {"date": "04/29/2026", "role": "Senior Full Stack TypeScript Developer with DevOps", "company": "TenMileSquareTechnologies", "url": "https://jobs.smartrecruiters.com/TenMileSquareTechnologies/744000088569106-senior-full-stack-typescript-developer-with-devops"},
    {"date": "04/29/2026", "role": "Senior Full Stack Engineer", "company": "creatoriq", "url": "https://jobs.ashbyhq.com/creatoriq/7cea5ca2-8a8f-4b34-9fcf-0f7d7f99105f"},
    {"date": "04/29/2026", "role": "Staff Software Engineer, Automation Infrastructure", "company": "clickup", "url": "https://jobs.ashbyhq.com/clickup/be6a8ca4-17ee-410e-b87d-a0b966b4311f"},
    {"date": "04/29/2026", "role": "Remote Software Engineer", "company": "break-sports", "url": "https://jobs.gusto.com/postings/break-sports-inc-remote-software-engineer-f91fafe7-625e-4f75-8efb-488c2064586c"},
    {"date": "04/29/2026", "role": "Senior Fullstack Engineer", "company": "playlab", "url": "https://jobs.ashbyhq.com/playlab/4d5e585f-bbcb-44c7-ba4f-a93b216c0288"},
    {"date": "04/29/2026", "role": "Senior Front End Engineer - USA located only", "company": "invaluable", "url": "https://invaluable.applytojob.com/apply/2vXCEtNmeB/Senior-Front-End-Engineer-USA-Located-Only"},
    {"date": "04/29/2026", "role": "Senior Backend Engineer", "company": "kovo", "url": "https://jobs.ashbyhq.com/kovo/451fa803-ced4-4449-9119-82762b650b0f"},
    {"date": "04/29/2026", "role": "Senior Full-Stack Engineer", "company": "monks", "url": "https://www.monks.com/careers/5821931004/job?gh_jid=5821931004"},
    {"date": "04/29/2026", "role": "Senior Software Engineer II - Authoring Apps", "company": "dbtlabsinc", "url": "https://job-boards.greenhouse.io/dbtlabsinc/jobs/4650235005"},
    {"date": "04/29/2026", "role": "Senior Full Stack Engineer, Meeting Intelligence", "company": "calendly", "url": "https://job-boards.greenhouse.io/calendly/jobs/8390060002"},
    {"date": "04/29/2026", "role": "Software Engineer - Frontend (Remote)", "company": "flaglerhealth", "url": "https://jobs.ashbyhq.com/flaglerhealth/9124eab7-4e98-428e-a89a-3ea3bdc1ee3a"},
    {"date": "04/29/2026", "role": "Senior Software Engineer, Enterprise Resilience", "company": "vanta", "url": "https://jobs.ashbyhq.com/vanta/1309bb8c-9cb5-463a-a30a-3a0c5fb5248a"},
    {"date": "04/29/2026", "role": "Senior Full Stack Engineer", "company": "solace", "url": "https://jobs.ashbyhq.com/solace/19759414-954f-48f7-a8d8-aaf1ae195122"},
    {"date": "04/28/2026", "role": "Lead Frontend Engineer", "company": "CarNow", "url": "https://carnow.applicantpro.com/jobs/4063175"},
    {"date": "04/28/2026", "role": "Senior Software Engineer", "company": "Certara", "url": "https://careers.certara.com/jobs/2372"},
    {"date": "04/28/2026", "role": "Frontend Engineer", "company": "CareerVillage", "url": "https://job-boards.greenhouse.io/careervillage/jobs/5111412007"},
    {"date": "04/28/2026", "role": "Lead Software Engineer", "company": "Emerald", "url": "https://ats.rippling.com/en-GB/emeraldx/jobs/031d6ba6-31bc-42a0-b955-cc22a638da66"},
    {"date": "04/28/2026", "role": "Senior Software Engineer | Remote", "company": "Process Street", "url": "https://job-boards.greenhouse.io/processstreet/jobs/8519438002?gh_src=hvtpxm632us"},
    {"date": "04/28/2026", "role": "Software Engineer", "company": "WellSync", "url": "https://wellsync-3.betterteam.com/software-engineer-2"},
    {"date": "04/28/2026", "role": "Senior Software Engineer - Supply Chain Systems", "company": "UrbanStems", "url": "https://urbanstems.com/a/careers/jobs/109090?locale=en"},
    {"date": "04/28/2026", "role": "Full-Stack Software Developer", "company": "loxo", "url": "https://pod4.app.loxo.co/job/NDA3ODgtMmtiMDNtcXJpOHRkbWZxYQ==?source_type=li&t=1776983313"},
    {"date": "04/28/2026", "role": "Senior UX Engineer with Full Stack TypeScript", "company": "Ten Mile Square", "url": "https://jobs.smartrecruiters.com/TenMileSquareTechnologies/744000109805017-senior-ux-engineer-with-full-stack-typescript"},
    {"date": "04/28/2026", "role": "Senior Software Engineer, 3D (USA)", "company": "DroneDeploy", "url": "https://jobs.lever.co/dronedeploy/875161e1-4671-448d-b97b-56c958946384"},
    {"date": "04/28/2026", "role": "Senior Software Engineer, Frontend", "company": "Docker", "url": "https://jobs.ashbyhq.com/docker/42fd9b39-25ef-402e-b785-eab1451c12eb?utm_source=Linkedin+Posting"},
    {"date": "04/28/2026", "role": "Senior Software Engineer - Claims Management", "company": "Snapsheet", "url": "https://snapsheet.applytojob.com/apply/cbF5a915Aw?source=LinkedIn"},
    {"date": "04/28/2026", "role": "Sr. Fullstack Software Engineer, Test Experience", "company": "Vanta", "url": "https://jobs.ashbyhq.com/vanta/fbb10f01-e012-44ab-aed2-2e6e6e93caa9?source=linkedin"},
    {"date": "04/28/2026", "role": "Software Engineer III", "company": "CData", "url": "https://ats.rippling.com/en-GB/cdata-software/jobs/1c5ba33f-12fe-4af0-84d4-e89fffae84b9?jobSite=LinkedIn2409769"},
    {"date": "04/28/2026", "role": "Senior Full Stack Engineer - Team Lead", "company": "RxVantage", "url": "https://www.rxvantage.com/company/careers/jobs?gh_jid=5980338004&gh_src=wzf8w0d54us"},
    {"date": "04/28/2026", "role": "Full Stack Software Engineer (Remote)", "company": "Unframe", "url": "https://job-boards.eu.greenhouse.io/unframe/jobs/4847758101?gh_src=52wcafg2teu"},
    {"date": "04/28/2026", "role": "Senior Software Engineer, Full-Stack (Launch)", "company": "Owner", "url": "https://jobs.ashbyhq.com/owner/6b93fa5f-cb40-4540-bbd0-ab709ada4cd3?utm_source=linkedinjw"},
    {"date": "04/28/2026", "role": "Fullstack Senior Software Engineer", "company": "SMG", "url": "https://servicemanagementgroup.applytojob.com/apply/Fiqn6dRNHs/Fullstack-Senior-Software-Engineer"},
    {"date": "04/28/2026", "role": "Senior Software Engineer (Full Stack)", "company": "MaRe", "url": "https://join.com/companies/mareheadspacom/16058079-senior-software-engineer-full-stack?pid=0a9968ed210507e82356"},
    {"date": "04/28/2026", "role": "Software Engineer (Mid-Level)", "company": "AxisCare", "url": "https://axiscare.bamboohr.com/careers/142"},
    {"date": "04/28/2026", "role": "Lead Software Engineer", "company": "The Knot Worldwide", "url": "https://job-boards.greenhouse.io/theknotworldwide/jobs/5199507008"},
    {"date": "04/28/2026", "role": "Staff Software Engineer", "company": "Planned Parenthood", "url": "https://careers.hireology.com/ppdirect/2737349/description"},
    {"date": "04/28/2026", "role": "Software Engineer (II or Senior) - Backend", "company": "Ovation", "url": "https://jobs.lever.co/distro/97306d5c-1da1-4953-b0d4-ef5a5cb56be5"},
    {"date": "04/28/2026", "role": "Senior Full-Stack Software Engineer", "company": "3Pillar", "url": "https://jobs.lever.co/3pillarglobal/664123be-cc3d-45fd-a11c-81d17a369b46"},
    {"date": "04/28/2026", "role": "Staff Software Engineer", "company": "Portless", "url": "https://jobs.workable.com/view/t1UrYUHmkHMVMt2HWkJdV7/remote-staff-software-engineer-in-united-states-at-portless"},
    {"date": "04/28/2026", "role": "Full Stack Developer", "company": "Marion Counseling", "url": "https://jobs.gohire.io/marion-counseling-services-4jhfbbv4/full-stack-developer-283922/?ref=aHR0cHM6Ly9oaXJpbmcuY2FmZS8="},
    {"date": "04/28/2026", "role": "Front-End Web Developer, B2B, Marketing Technology", "company": "DoorDash", "url": "https://job-boards.greenhouse.io/doordashusa/jobs/7751558"},
    {"date": "04/28/2026", "role": "Senior Software Engineer", "company": "Edgesource", "url": "https://www.edgesource.com/careers/?ashby_jid=4aa63885-c3ee-41a8-874e-b8210c642b72&utm_source=gM13eQXbwQ"},
    {"date": "04/28/2026", "role": "Software Engineer III", "company": "Blackstone Talent Group", "url": "https://jobs.bstonetalent.com/Software-Engineer-III-Jobs-in-Brooklyn-New-York/13717181"},
    {"date": "04/28/2026", "role": "Fullstack React js Developer", "company": "aplitrak", "url": "https://www.aplitrak.com/?adid=QWxpY2lhLlBlaWZmZXIuNjg2NTQuMTU1MEBsdWNhc2dyb3VwLmFwbGl0cmFrLmNvbQ"},
    {"date": "04/28/2026", "role": "Sr. Full Stack Digital Services Software Engineer #1821", "company": "Wellmark", "url": "https://jobs.smartrecruiters.com/WellmarkInc/744000122745308-sr-full-stack-digital-services-software-engineer-1821?trid=2d92f286-613b-4daf-9dfa-6340ffbecf73"},
    {"date": "04/28/2026", "role": "Sr Software Engineer, React Native", "company": "TextUs", "url": "https://job-boards.greenhouse.io/textus/jobs/5981760004?gh_jid=5981760004&gh_src=ajcx1bex4us"},
    {"date": "04/28/2026", "role": "Web Developer", "company": "Peraton", "url": "https://www.careers.peraton.com/jobs/web-developer-undefined-undefined-166067-jobs--information-technology--?iis=Job%2BBoard&iisn=LinkedIn"},
    {"date": "04/28/2026", "role": "Sr Software Engineer (MANTL)", "company": "Alkami", "url": "https://alkami.wd12.myworkdayjobs.com/alkami/job/US-Remote/Sr-Software-Engineer--MANTL-_JR-000629?source=LinkedIn"},
    {"date": "04/28/2026", "role": "Senior AEM & React / Next.js Software Engineer (Remote anywhere in the US)", "company": "Subway", "url": "https://jobs.dayforcehcm.com/en-US/subway/CANDIDATEPORTAL/jobs/29889"},
    {"date": "04/28/2026", "role": "Senior Software Engineer II, Platform UI (Remote)", "company": "Optro", "url": "https://jobs.ashbyhq.com/optro/5426c2f4-2721-46fd-8e87-5632af55b6e6?utm_source=rPG0gB4DGo"},
]


@dataclass
class FetchedJob:
    title: str
    description: str


def strip_html(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html or "")
    return unescape(re.sub(r"\s+", " ", text)).strip()


def parse_date(value: str) -> datetime:
    return datetime.strptime(value, "%m/%d/%Y")


def fetch_greenhouse(url: str, client: httpx.Client) -> FetchedJob | None:
    match = re.search(r"greenhouse\.io/([^/?#]+)/jobs/(\d+)", url) or re.search(
        r"gh_jid=(\d+)", url
    )
    if not match:
        return None
    if match.lastindex == 2:
        board, job_id = match.group(1), match.group(2)
    else:
        job_id = match.group(1)
        board_match = re.search(r"greenhouse\.io/([^/?#]+)", url)
        if not board_match:
            host_match = re.search(r"//([^.]+)\.(?:com|io)/", url)
            board = host_match.group(1) if host_match else None
        else:
            board = board_match.group(1)
        if not board:
            return None
    response = client.get(
        f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs/{job_id}"
    )
    if response.status_code != 200:
        return None
    payload = response.json()
    description = strip_html(payload.get("content") or "")
    if len(description) < 50:
        return None
    return FetchedJob(title=payload.get("title") or "", description=description)


def fetch_lever(url: str, client: httpx.Client) -> FetchedJob | None:
    match = re.search(r"jobs\.lever\.co/([^/]+)/([^/?#]+)", url)
    if not match:
        return None
    response = client.get(
        f"https://api.lever.co/v0/postings/{match.group(1)}/{match.group(2)}?mode=json"
    )
    if response.status_code != 200:
        return None
    payload = response.json()
    description = strip_html(payload.get("description") or "") or (
        payload.get("descriptionPlain") or ""
    ).strip()
    if len(description) < 50:
        return None
    return FetchedJob(title=payload.get("text") or "", description=description)


def fetch_ashby(url: str, client: httpx.Client) -> FetchedJob | None:
    match = re.search(r"jobs\.ashbyhq\.com/([^/]+)/([^/?#]+)", url)
    if not match:
        return None
    org, slug = match.group(1), match.group(2)
    response = client.get(f"https://api.ashbyhq.com/posting-api/job-board/{org}")
    if response.status_code != 200:
        return None
    for job in response.json().get("jobs", []):
        blob = json.dumps(job)
        if slug not in blob:
            continue
        description = (job.get("descriptionPlain") or "").strip() or strip_html(
            job.get("descriptionHtml") or ""
        )
        if len(description) < 50:
            continue
        return FetchedJob(title=job.get("title") or "", description=description)
    return None


def fetch_smartrecruiters(url: str, client: httpx.Client) -> FetchedJob | None:
    match = re.search(r"smartrecruiters\.com/([^/]+)/(\d+)-", url)
    if not match:
        return None
    company, job_id = match.group(1), match.group(2)
    response = client.get(
        f"https://api.smartrecruiters.com/v1/companies/{company}/postings/{job_id}"
    )
    if response.status_code != 200:
        return None
    payload = response.json()
    sections = payload.get("jobAd", {}).get("sections", {})
    parts: list[str] = []
    for section in sections.values():
        if isinstance(section, dict) and section.get("text"):
            parts.append(strip_html(section["text"]))
    description = "\n\n".join(part for part in parts if part)
    if len(description) < 50:
        return None
    return FetchedJob(title=payload.get("name") or "", description=description)


def fetch_jsonld(url: str, client: httpx.Client) -> FetchedJob | None:
    response = client.get(url)
    if response.status_code >= 400:
        return None
    if "error=true" in str(response.url):
        return None
    html = response.text
    lowered = html.lower()
    if any(phrase in lowered for phrase in DEAD_PHRASES) and len(html) < 100_000:
        return None
    for block in re.findall(
        r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',
        html,
        re.S | re.I,
    ):
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            if not isinstance(item, dict):
                continue
            item_type = item.get("@type", "")
            if item_type == "JobPosting" or (
                isinstance(item_type, list) and "JobPosting" in item_type
            ):
                description = strip_html(item.get("description") or "")
                if len(description) >= 50:
                    return FetchedJob(
                        title=item.get("title") or "",
                        description=description,
                    )
    return None


def fetch_job(url: str, client: httpx.Client) -> FetchedJob | None:
    url_lower = url.lower()
    fetchers = []
    if "greenhouse.io" in url_lower or "gh_jid=" in url_lower:
        fetchers.append(fetch_greenhouse)
    if "ashbyhq.com" in url_lower:
        fetchers.append(fetch_ashby)
    if "lever.co" in url_lower:
        fetchers.append(fetch_lever)
    if "smartrecruiters.com" in url_lower:
        fetchers.append(fetch_smartrecruiters)
    fetchers.append(fetch_jsonld)

    seen: set[str] = set()
    for fetcher in fetchers:
        key = fetcher.__name__
        if key in seen:
            continue
        seen.add(key)
        try:
            result = fetcher(url, client)
        except httpx.HTTPError:
            result = None
        if result and len(result.description) >= 50:
            return result
    return None


def normalize_company(name: str) -> str:
    cleaned = (name or "").strip()
    if not cleaned:
        return "Unknown"
    return cleaned[:255]


def import_posts(limit: int = 10) -> None:
    rows = sorted(SPREADSHEET_ROWS, key=lambda row: parse_date(row["date"]), reverse=True)
    created = 0
    skipped: list[str] = []

    with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=30) as client:
        with SessionLocal() as db:
            for row in rows:
                if created >= limit:
                    break
                url = row["url"].strip()
                fetched = fetch_job(url, client)
                if not fetched:
                    skipped.append(f"{row['company']} | {row['role'][:50]} | expired/unavailable")
                    print(f"SKIP  {row['company']} — {row['role']}")
                    continue

                role = (row["role"] or fetched.title or "Software Engineer").strip()[:255]
                company = normalize_company(row["company"])
                description = fetched.description.strip()
                if fetched.title and fetched.title.lower() not in role.lower():
                    description = f"Title: {fetched.title}\n\n{description}"

                record = create_job_post(
                    db,
                    JobPostCreateRequest(
                        company=company,
                        role=role,
                        url=url,
                        job_description=description,
                    ),
                )
                created += 1
                print(
                    f"OK #{record.id} {company} — {role} "
                    f"({len(description)} chars, applied {row['date']})"
                )

    print(f"\nCreated {created} post(s). Skipped {len(skipped)} unavailable URL(s).")
    if created < limit:
        print(f"Warning: only found {created} live postings (requested {limit}).")


if __name__ == "__main__":
    import_posts(limit=10)
