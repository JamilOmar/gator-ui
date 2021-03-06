import {Component, OnInit} from '@angular/core';
import {GitService, DevDetails} from '../git-service';
import {WeekDay} from '@angular/common';
import {Chart} from 'chart.js';
import {preserveWhitespacesDefault} from '@angular/compiler';

@Component({
  selector: 'app-ic-report',
  templateUrl: './ic-report.component.html',
  styleUrls: ['./ic-report.component.less'],
})
export class IcReportComponent implements OnInit {
  closeCtr: number[] = [];
  openCtr: number[] = [];
  allDates: number[] = [];
  reviewData: number[] = [0, 3, 0];
  ACHIEVED: number = 3;
  NEEDIMPROVEMENT: number = 1;
  EXCEED: number = 7;
  chart = [];
  currentOrg: string;
  constructor(private gitService: GitService) {}

  ngOnInit() {
    //this.textStatus = 'Checking permission ...';
    this.gitService.getCurrentOrg().then(r => {
      this.currentOrg = r;
      this.gitService.onDevLoginIdChanged.subscribe(val => {
        this.getReports(val).then(() => {
          this.getReviewData(val);
        });
        this.getGraphData(val);
      });
    });
  }

  textStatus: string;
  async getReports(dev: DevDetails): Promise<any> {
    this.textStatus = '';
    this.reviewData = [0, 0, 0];
    return new Promise((done, fail) => {
      let loggedUser = this.gitService.getLoggedInDev().Login;

      this.gitService.getSR4User(dev.Login, false).subscribe(async val => {
        if (!val) {
          this.textStatus = 'No Data Found!!!';
        }

        await Promise.all(
          val.map(item => {
            let status = '';
            if (item.ManagerStatus) {
              if (item.ManagerStatus === this.ACHIEVED) {
                this.reviewData[1] += 1;
                status = 'Achieved';
              }
              if (item.ManagerStatus === this.NEEDIMPROVEMENT) {
                this.reviewData[2] += 1;
                status = 'Need Improvement';
              }
              if (item.ManagerStatus === this.EXCEED) {
                this.reviewData[0] += 1; //Just increment by one there is no need to increment it by 7
                status = 'Exceeded';
              }
            } else {
              this.reviewData[1] += 1;
              status = 'Achieved';
            }
            if (!item.ManagerComment) {
              item.ManagerComment = 'No Comments';
            }
            if (item)
              this.textStatus =
                this.textStatus +
                item.StatusDetails +
                '<p style="color: red"' +
                "<br><br> ---------------------- Manager's Comment ----------------------------" +
                '<br>' +
                item.ManagerComment +
                '<br>' +
                'Rating: ' +
                status +
                '<br>Reviewer: ' +
                item.Reviewer +
                '<br>' +
                'Date: ' +
                item.ReportDate.substring(0, 10) +
                ' <br>' +
                '___________________________________________________ </p> <br><br>';
          }),
        ).then(res => {
          done(true);
        });
      });
      // }
      // });
    });
  }

  reportsId: [number] = [0];
  totalClose = 0;
  totalOpen = 0;
  getGraphData(dev: DevDetails) {
    this.closeCtr = [];
    this.openCtr = [];
    this.allDates = [];
    this.totalClose = 0;
    this.totalOpen = 0;
    this.gitService.getGraphData4XDays(this.gitService.getCurrentGitOrg(), dev.GitLogin, 90).subscribe(results => {
      results.map(res => {
        if (res.State === 'closed') {
          this.closeCtr.push(res.Ctr);
          this.totalClose = this.totalClose + res.Ctr;
        }
        if (res.State === 'open') {
          this.openCtr.push(res.Ctr);
          this.totalOpen = this.totalOpen + res.Ctr;
        }
      });

      //this.allDates = res.map ( res => res.Date );
      //NOTE: Now i am only showing openCtr - if you change then below line need to change
      for (let i = 1; i < this.openCtr.length; i++) {
        this.allDates.push(i);
      }

      this.chart = new Chart('canvas', {
        type: 'line',
        data: {
          labels: this.allDates,
          datasets: [
            // {
            //   data: this.closeCtr,
            //   borderColor: '#98FB98',
            //   fill: false,
            //   label: 'close',
            // },
            {
              data: this.openCtr,
              borderColor: '#ff00ff',
              fill: false,
              label: 'open',
            },
          ],
        },
        options: {
          maintainAspectRatio: true,
          events: [],
          legned: {
            display: true,
          },
          scales: {
            xAxes: [
              {
                display: true,
              },
            ],
            yAxes: [
              {
                display: true,
              },
            ],
          },
        },
      });
    });
  }

  getReviewData(dev: DevDetails) {
    this.closeCtr = [];
    this.openCtr = [];
    this.allDates = [];
    this.chart = new Chart('canvas2', {
      type: 'bar',
      data: {
        labels: ['Exceeded', 'Achieved', 'Need Improvement'],
        datasets: [
          {
            data: this.reviewData,
            fill: true,
            label: 'Review Ratings',
            backgroundColor: ['#75a0c9', '#98FB98', '#9c678f'],
          },
        ],
      },
      options: {
        maintainAspectRatio: true,
        events: [],
        legned: {
          display: true,
          labels: {
            fontColor: 'rgb(255, 255, 255)',
          },
        },
        scales: {
          xAxes: [
            {
              display: true,
            },
          ],
          yAxes: [
            {
              display: true,
            },
          ],
        },
      },
    });
  }
}
