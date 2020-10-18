import {Component, OnInit, EventEmitter, Inject, Output, Injectable, ViewChild} from '@angular/core';
import {Router, NavigationEnd} from '@angular/router';
import {GitService, DevDetails} from '../git-service';
import {LOCAL_STORAGE, WebStorageService} from 'ngx-webstorage-service';
import {Observable, of} from 'rxjs';
import {toArray} from 'rxjs/operators';
import {DialogModule} from 'primeng/dialog';
import {InputTextareaModule} from 'primeng/inputtextarea';

import * as _ from 'lodash';
import {animate, state, style, transition, trigger, stagger, query, keyframes} from '@angular/animations';
import {ContextMenuComponent} from 'ngx-contextmenu';
import {SortIcon} from 'primeng';

@Component({
  selector: 'app-all-user',
  templateUrl: './all-user.component.html',
  styleUrls: ['./all-user.component.less'],
})
export class AllUserComponent implements OnInit {
  developers: any[];
  devDetails: any[];
  navigationSubscription: any;
  backgroundColor: string = '#26262fcc';
  filterQuery: string;
  OrgDevelopers: DevDetails[];
  bShowGitDetails: boolean = false;
  selectedDev: string;
  gitOrg: string;
  currentOrg: string;
  //items = [{label: 'Send Kudos'}, {label: 'Start a Watch'}];
  items = [
    {name: 'John', otherProperty: 'Foo'},
    {name: 'Joe', otherProperty: 'Bar'},
  ];
  display: boolean = false;
  kudoesText: string = 'Please type here your kudoes ...';

  constructor(private gitService: GitService, @Inject(LOCAL_STORAGE) private storage: WebStorageService, private router: Router) {
    this.developers = [];

    this.gitService.onGlobalComponentMessage.subscribe((val: string) => {
      if (val === 'REPO_CLICKED') {
        this.backgroundColor = '#26262fcc';
      }
    });

    this.navigationSubscription = this.router.events.subscribe((e: any) => {
      // If it is a NavigationEnd event re-initalise the component
      if (e instanceof NavigationEnd) {
        this.gitOrg = this.gitService.getCurrentGitOrg();
        this.initializeData();
      }
    });

    this.gitService.onGitOrgChanged.subscribe(x => {
      this.gitOrg = x;
    });

    if (!this.currentOrg) {
      //org is empty, we must go back to dash board and let them choose the org
      this.gitService.checkOrg().then(x => {
        if (x === 404) {
          console.log(`From TopDeveloperComponent ..heading to lsauth because checkorg is 404`);
          this.router.navigate(['/lsauth']); //May be right login
        }
      });
      this.gitService.getCurrentOrg().then(r => {
        this.currentOrg = r;
      });
    }
  }

  @ViewChild(ContextMenuComponent) public basicMenu: ContextMenuComponent;

  ngOnDestroy() {
    // avoid memory leaks here by cleaning up after ourselves. If we
    // don't then we will continue to run our initialiseInvites()
    // method on every navigationEnd event.
    if (this.navigationSubscription) {
      this.navigationSubscription.unsubscribe();
    }
  }

  GetData(dev: DevDetails) {
    this.gitService.setCurrentDev(dev);
    if (this.gitService.getCurrentContext() === 'undefined') this.gitService.setCurrentContext('GIT');
    this.selectedDev = dev.GitLogin;
    if (this.gitService.getCurrentContext() === 'JIRA') {
      this.jiraData(dev);
    } else {
      this.gitData(dev);
    }
  }

  getBGStyle(val: DevDetails) {
    let clr = 'white';
    if (this.selectedDev === val.GitLogin) {
      if (this.gitService.getCurrentContext() === 'JIRA') {
        clr = 'rgb(86, 125, 143)';
      } else {
        clr = 'rgb(170, 125, 105)';
      }
      return {
        background: clr,
        color: 'white',
      };
    } else {
      return {
        background: '#26262fcc',
        color: 'white',
      };
    }
  }

  getMyStyle(val: DevDetails) {
    if (!val.GitLogin) {
      return;
    }
    let clr = 'white';
    if (this.gitService.getCurrentContext() === 'JIRA') {
      clr = 'rgb(86, 125, 143)';
    } else {
      clr = 'rgb(170, 125, 105)';
    }

    if (this.selectedDev === val.GitLogin) {
      return {
        color: clr,
      };
    } else {
      return {
        color: 'white',
      };
    }
  }

  gitData(developer: DevDetails) {
    const date = new Date();

    // this.usageService.send ({event: 'Dev Details', info: 'Dev: ' + developer,  LogTime: date.toUTCString()});
    //this trigger kicks dev-pull-details components as it is subscribed to
    //this trigger, which in turn goes and fill the devloper details for git
    //  this.gitService.setCurrentDev(developer);
    //this.gitService.trigger(developer.login);
    this.gitService.broadcastDevLoginId(developer);
    this.gitService.broadcastGlobalComponentMessage('SHOW_PULL_DETAILS');

    //This to add developer Git details in the status report component
    if (!this.bShowGitDetails) {
      //This event specially targetted to status report module
      this.gitService.broadcastCustomEvent({
        source: 'TOP-DEVELOPER',
        destination: 'STATUS-REPORT',
        message: developer.GitLogin,
      });
    }
  }

  jiraData(developer: DevDetails) {
    this.gitService.broadcastJiraDevName(developer);
    this.gitService.broadcastGlobalComponentMessage('SHOW_JIRA_DETAILS');
  }

  filterDev(str: string) {
    if (str.length === 0) {
      this.developers = this.OrgDevelopers;
      return;
    }
    str = str.toLowerCase();
    this.developers = this.OrgDevelopers.filter(d => d.name.toLowerCase().substring(0, str.length) === str);
  }

  defaultBackground: string;
  defaultColor: string;

  initializeData() {
    this.developers = [];
    /* GitHub introduced a new AvatarURL link for new data, and thats making us bring duplicate names of dev
    I am using this map to filter out the array of Dev names, so the UI showsa only one name
    */
    let map = new Map<string, string>();
    this.gitService.ready().then(result => {
      this.gitService.getCurrentOrg().then(org => {
        this.gitService.getAllUsers(org).subscribe(r => {
          this.developers = [];
          r.forEach(r2 => {
            let dd = new DevDetails();
            dd.name = r2.UserDisplayName.trim();
            dd.UserName = r2.UserName;
            dd.DisplayName = r2.UserDisplayName;
            dd.Login = r2.Email;
            dd.image = r2.Avatar_Url;
            dd.id = r2.Id;
            dd.profileUrl = r2.Avatar_Url;
            dd.GitLogin = r2.GitUserName;
            dd.JiraUserName = r2.JiraUserName;
            dd.TfsUserName = r2.TfsUserName;
            if (!map.has(dd.name)) {
              map.set(dd.name, dd.name);
              this.developers.push(dd);
            }
          });
          this.OrgDevelopers = this.developers;
        });
      });
    });
  }

  showWatch(dev: DevDetails) {
    alert(`Someone is watching your PR. Right click to subscribe to anyone's PR`);
  }

  ngOnInit() {
    let bCallingFromInit = true;
    this.initializeData();

    //clearTimeout(timer);
  }
}
